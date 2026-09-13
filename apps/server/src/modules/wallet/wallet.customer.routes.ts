import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/require-role";
import * as controller from "./wallet.customer.controller";

/** Mounted at /wallet. Customers only — kitchen staff hold no wallet. */
export const customerWalletRouter = Router();

customerWalletRouter.use(authenticate, requireRole("CUSTOMER"));

customerWalletRouter.get("/", controller.getWallet);
customerWalletRouter.post("/topup", controller.topUp);
customerWalletRouter.get("/transactions", controller.listTransactions);
