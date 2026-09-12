import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/require-role";
import * as controller from "./restaurant.kitchen.controller";

/** Mounted at /kitchen. Restaurant-wide operational state, staff only. */
export const kitchenRestaurantRouter = Router();

kitchenRestaurantRouter.use(authenticate, requireRole("KITCHEN"));

kitchenRestaurantRouter.get("/settings", controller.getSettings);
// Drives both the header "Close Restaurant" button and the Edit Hours panel.
kitchenRestaurantRouter.patch("/settings", controller.updateSettings);
