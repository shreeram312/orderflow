import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/require-role";
import * as controller from "./order.customer.controller";

/** Mounted at /orders. Customers only; the kitchen queue is a separate surface. */
export const customerOrderRouter = Router();

customerOrderRouter.use(authenticate, requireRole("CUSTOMER"));

customerOrderRouter.post("/", controller.createOrder);
customerOrderRouter.get("/", controller.listOrders);
customerOrderRouter.get("/:id", controller.getOrder);
