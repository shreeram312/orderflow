import { z } from "zod";

/** 24-hour "HH:MM". */
const time = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM, e.g. 09:00");

export const updateSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    isOpen: z.boolean().optional(),
    opensAt: time.optional(),
    closesAt: time.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update");

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
