import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import * as controller from "./auth.controller";

export const authRouter = Router();

// Two signup endpoints, because this is where role is decided. Each handler
// writes a literal role; neither reads it from the request body.
authRouter.post("/signup", controller.signupCustomer);
authRouter.post("/signup/kitchen", controller.signupKitchen);

// One login endpoint for both roles. The role already exists in the database
// by this point, so there is nothing for the client to choose.
authRouter.post("/login", controller.login);
authRouter.post("/logout", controller.logout);

authRouter.get("/me", authenticate, controller.me);
