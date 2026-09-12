import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./env.server";
import { ok } from "./lib/response";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./modules/auth/auth.routes";
import { customerMenuRouter } from "./modules/menu/menu.customer.routes";
import { kitchenMenuRouter } from "./modules/menu/menu.kitchen.routes";
import { kitchenRestaurantRouter } from "./modules/restaurant/restaurant.kitchen.routes";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    // Required for the session cookie to cross localhost:3001 -> localhost:3000.
    // Without it the browser silently drops the cookie and every request is 401.
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  ok(res, { uptime: process.uptime() });
});

app.use("/auth", authRouter);

// Customer surface. The menu is readable before signing in.
app.use("/menu", customerMenuRouter);

// Kitchen surface. Each router applies authenticate + requireRole("KITCHEN").
app.use("/kitchen/menu", kitchenMenuRouter);
app.use("/kitchen", kitchenRestaurantRouter);

app.use(errorHandler);

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
