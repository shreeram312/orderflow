import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/require-role";
import * as controller from "./menu.kitchen.controller";

/** Mounted at /kitchen/menu. Every route below is behind the KITCHEN role. */
export const kitchenMenuRouter = Router();

kitchenMenuRouter.use(authenticate, requireRole("KITCHEN"));

kitchenMenuRouter.get("/", controller.listMenu);
kitchenMenuRouter.post("/", controller.createMenuItem);
kitchenMenuRouter.get("/:id", controller.getMenuItem);
kitchenMenuRouter.patch("/:id", controller.updateMenuItem);
kitchenMenuRouter.patch("/:id/status", controller.updateMenuItemStatus);
// Soft delete — sets ARCHIVED rather than removing the row.
kitchenMenuRouter.delete("/:id", controller.archiveMenuItem);
