import { Prisma, type Database } from "@my-better-t-app/db";

export type Tx = Prisma.TransactionClient;

/**
 * Prisma's defaults (2s to acquire a connection, 5s to finish) are tuned for a
 * database next door. Neon is a network hop away and pools connections, so a
 * busy moment can blow the 2s acquire window and fail work that was fine.
 */
export const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;

/** Postgres unique violation, as Prisma reports it. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Runs `work` at most once per (eventId, consumer), however many times
 * RabbitMQ delivers the event.
 *
 * The processed_events row is inserted FIRST, inside the same transaction as
 * the work. A redelivery hits the primary key and throws P2002 before any work
 * happens; a crash halfway through rolls the marker back along with the work,
 * so the retry starts clean. Recording it in a separate transaction would
 * reopen exactly the gap this exists to close.
 *
 * Two copies arriving at the same instant are also safe: the second INSERT
 * blocks on the first's uncommitted row, then fails once it commits.
 *
 * A unique violation thrown by `work` itself also reads as a duplicate. That
 * is intended: it means a data-layer guard (like the one-REFUND-per-order
 * constraint) caught work that already happened by some other path.
 */
export async function processOnce<T>(
  db: Database,
  consumer: string,
  eventId: string,
  work: (tx: Tx) => Promise<T>,
): Promise<{ duplicate: true } | { duplicate: false; result: T }> {
  try {
    const result = await db.$transaction(async (tx) => {
      await tx.processedEvent.create({ data: { eventId, consumer } });
      return work(tx);
    }, TX_OPTIONS);
    return { duplicate: false, result };
  } catch (error) {
    if (isUniqueViolation(error)) return { duplicate: true };
    throw error;
  }
}
