import { badRequest, conflict, notFound } from "../../lib/http-error";
import { getDb } from "../../services";
import {
  ROUTING_KEYS,
  STATUS_ROUTING_KEYS,
  buildOrderCreatedEvent,
  buildOrderStatusChangedEvent,
  publishOrderEvent,
} from "./order.events";
import type { KitchenStatus } from "./order.events";
import type {
  CreateOrderInput,
  ListKitchenOrdersQuery,
} from "./order.schemas";

const toNumber = (value: { toString(): string }) => Number(value.toString());

export type OrderView = {
  id: string;
  status: string;
  totalAmount: number;
  failureReason: string | null;
  createdAt: Date;
  items: {
    id: string;
    menuItemId: string;
    name: string;
    unitPrice: number;
    quantity: number;
  }[];
};

type OrderRow = {
  id: string;
  status: string;
  totalAmount: { toString(): string };
  failureReason: string | null;
  createdAt: Date;
  items: {
    id: string;
    menuItemId: string;
    name: string;
    unitPrice: { toString(): string };
    quantity: number;
  }[];
};

function toView(row: OrderRow): OrderView {
  return {
    id: row.id,
    status: row.status,
    totalAmount: toNumber(row.totalAmount),
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    items: row.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.name,
      unitPrice: toNumber(item.unitPrice),
      quantity: item.quantity,
    })),
  };
}

/**
 * Creates an order and takes payment.
 *
 * Deliberately does NOT check whether items are PAUSED or the restaurant is
 * open — that decision belongs to the Order Worker, made asynchronously against
 * live state. The API only validates that items exist and can be priced.
 */
export async function createOrder(
  userId: string,
  input: CreateOrderInput,
): Promise<OrderView> {
  const db = getDb();

  const menuItems = await db.menuItem.findMany({
    where: {
      id: { in: input.items.map((i) => i.menuItemId) },
      status: { not: "ARCHIVED" },
    },
  });

  const byId = new Map(menuItems.map((item) => [item.id, item]));
  const missing = input.items.find((line) => !byId.has(line.menuItemId));
  if (missing)
    throw badRequest(
      "ITEM_NOT_FOUND",
      "One of those items is no longer available",
    );

  const lines = input.items.map((line) => {
    // Non-null: the missing check above already proved every id resolves.
    const menuItem = byId.get(line.menuItemId)!;
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      unitPrice: menuItem.price,
      quantity: line.quantity,
    };
  });

  const total = lines.reduce(
    (sum, line) => sum + toNumber(line.unitPrice) * line.quantity,
    0,
  );

  const order = await db.$transaction(async (tx) => {
    // Conditional debit: `balance >= total` lives in the WHERE clause, so two
    // orders placed at the same instant cannot both pass a read-then-write
    // check and overdraw the wallet.
    const { count } = await tx.wallet.updateMany({
      where: { userId, balance: { gte: total } },
      data: { balance: { decrement: total } },
    });

    if (count === 0) {
      throw badRequest(
        "INSUFFICIENT_BALANCE",
        "Your wallet does not cover this order",
      );
    }

    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });

    const created = await tx.order.create({
      data: {
        userId,
        totalAmount: total,
        items: { create: lines },
      },
      include: { items: true },
    });

    // Same transaction as the debit: a balance change with no ledger row is
    // unauditable, and a row with no balance change is a lie.
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        orderId: created.id,
        type: "DEBIT",
        amount: total,
        balanceAfter: wallet.balance,
        note: "Order payment",
      },
    });

    return created;
  });

  await publishOrderEvent(
    ROUTING_KEYS.orderCreated,
    buildOrderCreatedEvent({
      orderId: order.id,
      userId,
      totalAmount: total,
      items: lines.map((l) => ({
        menuItemId: l.menuItemId,
        name: l.name,
        quantity: l.quantity,
      })),
    }),
  );

  return toView(order);
}

export async function listOrders(userId: string): Promise<OrderView[]> {
  const rows = await getDb().order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return rows.map(toView);
}

export async function getOrder(
  userId: string,
  orderId: string,
): Promise<OrderView> {
  const row = await getDb().order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  // Ownership is part of the lookup: without it any signed-in user could read
  // any order by guessing an id.
  if (!row || row.userId !== userId)
    throw notFound("ORDER_NOT_FOUND", "That order does not exist");

  return toView(row);
}

/* ------------------------------------------------------------------ */
/* Kitchen surface                                                      */
/* ------------------------------------------------------------------ */

/** The live board: tickets the kitchen still has work to do on. */
const ACTIVE_STATUSES = ["CONFIRMED", "PREPARING", "READY"] as const;

/**
 * The status an order must already be in for a kitchen action to be legal.
 * Read it as "to reach READY, you must currently be PREPARING". This is the
 * whole state machine — there is no other path through the kitchen.
 */
const REQUIRED_CURRENT = {
  PREPARING: "CONFIRMED",
  READY: "PREPARING",
  COMPLETED: "READY",
} as const satisfies Record<KitchenStatus, string>;

export type KitchenOrderView = OrderView & {
  customerName: string;
};

export async function listForKitchen(
  query: ListKitchenOrdersQuery,
): Promise<KitchenOrderView[]> {
  const rows = await getDb().order.findMany({
    where: query.status
      ? { status: query.status }
      : { status: { in: [...ACTIVE_STATUSES] } },
    include: { items: true, user: { select: { name: true } } },
    // Oldest first. A kitchen works the queue in the order it arrived, so the
    // customer who has been waiting longest is at the top of the screen.
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return rows.map((row) => ({
    ...toView(row),
    customerName: row.user.name,
  }));
}

/**
 * Moves an order one step through the kitchen, then announces it.
 *
 * The guard is the WHERE clause, not the read above it: `status` is part of the
 * match, so two staff tapping the same button at once produce one update and
 * one 409, instead of two updates and two published events.
 */
export async function updateStatusFromKitchen(
  orderId: string,
  nextStatus: KitchenStatus,
): Promise<KitchenOrderView> {
  const db = getDb();

  const existing = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true },
  });

  if (!existing) throw notFound("ORDER_NOT_FOUND", "That order does not exist");

  const { count } = await db.order.updateMany({
    where: { id: orderId, status: REQUIRED_CURRENT[nextStatus] },
    data: { status: nextStatus },
  });

  if (count === 0) {
    throw conflict(
      "INVALID_STATUS_TRANSITION",
      `An order in ${existing.status} cannot be moved to ${nextStatus}`,
    );
  }

  // Outside any transaction and after the write, same as order creation: the
  // database is the source of truth, the event is a notification about it.
  await publishOrderEvent(
    STATUS_ROUTING_KEYS[nextStatus],
    buildOrderStatusChangedEvent({
      orderId,
      userId: existing.userId,
      status: nextStatus,
      previousStatus: existing.status,
    }),
  );

  const updated = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, user: { select: { name: true } } },
  });

  return { ...toView(updated), customerName: updated.user.name };
}
