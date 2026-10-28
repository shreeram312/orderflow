import {
  type KitchenStatus,
  ROUTING_KEYS,
  STATUS_ROUTING_KEYS,
  enqueueEvent,
} from "@my-better-t-app/messaging";

import { wakeOutbox } from "../../infra/rabbitmq";
import { badRequest, conflict, notFound } from "../../lib/http-error";
import { getDb } from "../../services";
import {
  orderCancelled,
  orderCreated,
  orderRejectedByKitchen,
  orderStatusChanged,
} from "./order.events";
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
 * The customer's view adds when their money came back. A REJECTED or CANCELLED
 * order is refunded by the payment worker a moment AFTER the status flips, so
 * for a short while the status says "refunded" and the wallet does not yet.
 * `refundedAt` lets the UI say "refund pending" honestly instead of guessing.
 */
export type CustomerOrderView = OrderView & { refundedAt: Date | null };

async function withRefunds(views: OrderView[]): Promise<CustomerOrderView[]> {
  const refunds = await getDb().walletTransaction.findMany({
    where: { type: "REFUND", orderId: { in: views.map((v) => v.id) } },
    select: { orderId: true, createdAt: true },
  });
  const refundedAt = new Map(refunds.map((r) => [r.orderId, r.createdAt]));

  return views.map((view) => ({ ...view, refundedAt: refundedAt.get(view.id) ?? null }));
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
  correlationId: string,
): Promise<CustomerOrderView> {
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

    // The outbox row commits with the order. Before this, the event was
    // published after the commit, and a broker hiccup in between left a paid
    // order stuck in PENDING forever with nothing in any queue.
    await enqueueEvent(
      tx,
      ROUTING_KEYS.orderCreated,
      orderCreated({
        orderId: created.id,
        correlationId,
        userId,
        totalAmount: total,
        items: lines.map((l) => ({
          menuItemId: l.menuItemId,
          name: l.name,
          quantity: l.quantity,
        })),
      }),
    );

    return created;
  });

  wakeOutbox();

  return { ...toView(order), refundedAt: null };
}

export async function listOrders(userId: string): Promise<CustomerOrderView[]> {
  const rows = await getDb().order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return withRefunds(rows.map(toView));
}

export async function getOrder(
  userId: string,
  orderId: string,
): Promise<CustomerOrderView> {
  const row = await getDb().order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  // Ownership is part of the lookup: without it any signed-in user could read
  // any order by guessing an id.
  if (!row || row.userId !== userId)
    throw notFound("ORDER_NOT_FOUND", "That order does not exist");

  const [view] = await withRefunds([toView(row)]);
  return view!;
}

/**
 * Cancelling is allowed until the kitchen starts cooking — after that the
 * food is real and the business would eat the cost. Kitchen rejection uses the
 * same window.
 */
const BEFORE_PREPARING = ["PENDING", "CONFIRMED"] as const;
type BeforePreparing = (typeof BEFORE_PREPARING)[number];

const isBeforePreparing = (status: string): status is BeforePreparing =>
  (BEFORE_PREPARING as readonly string[]).includes(status);

/**
 * Cancels an order and hands the refund to the payment worker.
 *
 * The cancel races the order worker, which may be confirming this exact order
 * right now. So the UPDATE is a compare-and-set on the status we just read:
 * if anything moved it in between, zero rows match and nothing is written.
 *
 * Note what is NOT here: the refund. The status change and the OrderCancelled
 * event commit together; the money comes back when the payment worker
 * consumes that event — a moment later, and even if it is down right now.
 */
export async function cancelOrder(
  userId: string,
  orderId: string,
  correlationId: string,
): Promise<CustomerOrderView> {
  const db = getDb();

  const existing = await db.order.findUnique({
    where: { id: orderId },
    select: { userId: true, status: true, totalAmount: true },
  });

  if (!existing || existing.userId !== userId)
    throw notFound("ORDER_NOT_FOUND", "That order does not exist");

  const fromStatus = existing.status;
  if (!isBeforePreparing(fromStatus)) {
    throw conflict(
      "ORDER_NOT_CANCELLABLE",
      `This order is already ${fromStatus.toLowerCase()} and can no longer be cancelled`,
    );
  }

  await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: fromStatus },
      data: { status: "CANCELLED" },
    });

    if (count === 0) {
      // Lost the race: the worker or the kitchen got there first.
      throw conflict(
        "ORDER_NOT_CANCELLABLE",
        "Your order changed status a moment ago. Check it and try again",
      );
    }

    await enqueueEvent(
      tx,
      ROUTING_KEYS.orderCancelled,
      orderCancelled({
        orderId,
        correlationId,
        userId,
        cancelledAtStatus: fromStatus,
        refundAmount: toNumber(existing.totalAmount),
      }),
    );
  });

  wakeOutbox();

  return getOrder(userId, orderId);
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

async function kitchenView(orderId: string): Promise<KitchenOrderView> {
  const row = await getDb().order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, user: { select: { name: true } } },
  });

  return { ...toView(row), customerName: row.user.name };
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
  correlationId: string,
): Promise<KitchenOrderView> {
  const db = getDb();

  const existing = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true },
  });

  if (!existing) throw notFound("ORDER_NOT_FOUND", "That order does not exist");

  await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: REQUIRED_CURRENT[nextStatus] },
      data: { status: nextStatus },
    });

    if (count === 0) {
      throw conflict(
        "INVALID_STATUS_TRANSITION",
        `An order in ${existing.status} cannot be moved to ${nextStatus}`,
      );
    }

    // Same transaction as the status change: the event exists if and only if
    // the change does.
    await enqueueEvent(
      tx,
      STATUS_ROUTING_KEYS[nextStatus],
      orderStatusChanged({
        orderId,
        correlationId,
        userId: existing.userId,
        status: nextStatus,
        previousStatus: existing.status,
      }),
    );
  });

  wakeOutbox();

  return kitchenView(orderId);
}

/**
 * Manual rejection — the kitchen saying no to an order the worker accepted
 * (or has not got to yet). Same status, same event, same refund path as an
 * automatic rejection; only the reason differs.
 */
export async function rejectFromKitchen(
  orderId: string,
  reason: string | undefined,
  correlationId: string,
): Promise<KitchenOrderView> {
  const db = getDb();

  const existing = await db.order.findUnique({
    where: { id: orderId },
    select: { userId: true, status: true, totalAmount: true },
  });

  if (!existing) throw notFound("ORDER_NOT_FOUND", "That order does not exist");

  const fromStatus = existing.status;
  if (!isBeforePreparing(fromStatus)) {
    throw conflict(
      "INVALID_STATUS_TRANSITION",
      `An order in ${fromStatus} can no longer be rejected`,
    );
  }

  const message = reason || "The kitchen could not take this order";

  await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: fromStatus },
      data: { status: "REJECTED", failureReason: message },
    });

    if (count === 0) {
      throw conflict(
        "INVALID_STATUS_TRANSITION",
        "This order changed status a moment ago. Refresh and try again",
      );
    }

    await enqueueEvent(
      tx,
      ROUTING_KEYS.orderRejected,
      orderRejectedByKitchen({
        orderId,
        correlationId,
        userId: existing.userId,
        message,
        refundAmount: toNumber(existing.totalAmount),
      }),
    );
  });

  wakeOutbox();

  return kitchenView(orderId);
}
