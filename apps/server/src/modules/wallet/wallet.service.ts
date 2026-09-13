import { getDb } from "../../services";
import type { ListTransactionsQuery, TopUpInput } from "./wallet.schemas";

export type WalletSummary = { balance: number };

export type WalletTransactionView = {
  id: string;
  type: "TOPUP" | "DEBIT" | "REFUND";
  amount: number;
  balanceAfter: number;
  note: string | null;
  orderId: string | null;
  createdAt: Date;
};

/** Decimal serialises to a JSON string, which breaks arithmetic on the client. */
const toNumber = (value: { toString(): string }) => Number(value.toString());

/**
 * Reads the customer's wallet, creating it on first access. upsert rather than
 * find-then-create so two concurrent first requests cannot both decide the row
 * is missing and race to insert it.
 */
export async function getWallet(userId: string): Promise<WalletSummary> {
  const wallet = await getDb().wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  return { balance: toNumber(wallet.balance) };
}

/**
 * Credits the wallet and records the movement in one transaction. The two must
 * not be separable: a balance change with no ledger row is unauditable, and a
 * ledger row with no balance change is a lie.
 *
 * Top-ups are simulated — there is no payment gateway behind this.
 */
export async function topUp(
  userId: string,
  input: TopUpInput,
): Promise<WalletSummary> {
  const db = getDb();

  return db.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: { balance: { increment: input.amount } },
      create: { userId, balance: input.amount },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "TOPUP",
        amount: input.amount,
        balanceAfter: wallet.balance,
        note: "Wallet top up",
      },
    });

    return { balance: toNumber(wallet.balance) };
  });
}

export async function listTransactions(
  userId: string,
  query: ListTransactionsQuery,
): Promise<WalletTransactionView[]> {
  const wallet = await getDb().wallet.findUnique({
    where: { userId },
    select: { id: true },
  });

  // No wallet yet simply means no movements, not an error.
  if (!wallet) return [];

  const rows = await getDb().walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: query.limit,
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    amount: toNumber(row.amount),
    balanceAfter: toNumber(row.balanceAfter),
    note: row.note,
    orderId: row.orderId,
    createdAt: row.createdAt,
  }));
}
