import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/require-role";
import * as controller from "./order.kitchen.controller";

/** Mounted at /kitchen/orders. The live ticket board, staff only. */
export const kitchenOrderRouter = Router();

kitchenOrderRouter.use(authenticate, requireRole("KITCHEN"));

kitchenOrderRouter.get("/", controller.listOrders);
// One step at a time: CONFIRMED -> PREPARING -> READY -> COMPLETED.
kitchenOrderRouter.patch("/:id/status", controller.updateOrderStatus);
