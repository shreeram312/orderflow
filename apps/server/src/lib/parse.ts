import type { ZodType } from "zod";

import { badRequest } from "./http-error";

/** Validates a request body or query, turning Zod failures into a 400 the UI can render inline. */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw badRequest(
      "VALIDATION_FAILED",
      "Please check the highlighted fields",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}
