import { Router } from "express";

import * as controller from "./menu.customer.controller";

/** Mounted at /menu. Intentionally unauthenticated — the menu is browsable before signing in. */
export const customerMenuRouter = Router();

customerMenuRouter.get("/", controller.getMenu);
