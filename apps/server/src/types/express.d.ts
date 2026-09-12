import type { SessionClaims } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. Undefined on public routes. */
      user?: SessionClaims;
    }
  }
}
