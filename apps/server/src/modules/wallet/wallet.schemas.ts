import { z } from "zod";

export const topUpSchema = z.object({
  amount: z
    .number()
    .positive("Enter an amount greater than zero")
    .max(50000, "Top up at most ₹50,000 at a time")
    .refine((n) => Number.isFinite(n), "Enter a valid amount")
    // Money is stored as Decimal(10,2); round here so a stray float cannot
    // introduce sub-paise precision.
    .transform((n) => Math.round(n * 100) / 100),
});

export const listTransactionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TopUpInput = z.infer<typeof topUpSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
