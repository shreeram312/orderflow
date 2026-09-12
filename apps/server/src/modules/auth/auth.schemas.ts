import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address");

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

const name = z.string().trim().min(1, "Name is required").max(80);

export const customerSignupSchema = z
  .object({
    name,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const kitchenSignupSchema = z
  .object({
    name,
    restaurantName: z.string().trim().min(1, "Restaurant name is required").max(120),
    // The UI supplies a fixed +91 dial code and restricts input to 10 digits,
    // so the stored value is always unambiguous E.164.
    phone: z
      .string()
      .trim()
      .regex(/^\+91[0-9]{10}$/, "Enter a valid 10-digit phone number"),
    email,
    password,
    confirmPassword: z.string(),
    code: z.string().min(1, "Staff signup code is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const loginSchema = z.object({
  email,
  // No length rule here on purpose: rejecting a short password at login would
  // leak that the stored one is longer. Any wrong value is just INVALID_CREDENTIALS.
  password: z.string().min(1, "Password is required"),
});

export type CustomerSignupInput = z.infer<typeof customerSignupSchema>;
export type KitchenSignupInput = z.infer<typeof kitchenSignupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
