import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { onShutdown } from "@my-better-t-app/messaging";
import { initBroker, isBrokerConnected, log, stopBroker } from "./infra/rabbitmq";
import { env } from "./env.server";
import { ok } from "./lib/response";
import { correlationId } from "./middleware/correlation-id";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./modules/auth/auth.routes";
import { customerMenuRouter } from "./modules/menu/menu.customer.routes";
import { kitchenMenuRouter } from "./modules/menu/menu.kitchen.routes";
import { kitchenRestaurantRouter } from "./modules/restaurant/restaurant.kitchen.routes";
import { customerOrderRouter } from "./modules/orders/order.customer.routes";
import { kitchenOrderRouter } from "./modules/orders/order.kitchen.routes";
import { customerWalletRouter } from "./modules/wallet/wallet.customer.routes";
import { getDb } from "./services";

const app = express();

// First, so even a CORS rejection is logged with an id.
app.use(correlationId);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    // Required for the session cookie to cross localhost:3001 -> localhost:3000.
    // Without it the browser silently drops the cookie and every request is 401.
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    exposedHeaders: ["x-correlation-id"],
  }),
);

app.use(express.json());
app.use(cookieParser());

/** Liveness: the process is up. Says nothing about its dependencies. */
app.get("/health", (_req, res) => {
  ok(res, { uptime: process.uptime() });
});

/**
 * Readiness: can this instance actually do its job? With five processes
 * running, "why is my order stuck" has five answers — this rules out two.
 *
 * The broker being down is reported but does not stop orders: they wait in
 * the outbox. The database being down does.
 */
app.get("/health/ready", async (_req, res) => {
  const database = await getDb()
    .$queryRaw`SELECT 1`.then(() => true)
    .catch(() => false);
  const broker = isBrokerConnected();

  res.status(database ? 200 : 503).json({
    status: database,
    message: database ? "Ready" : "Database unreachable",
    data: { database, broker },
  });
});

app.use("/auth", authRouter);

// Customer surface. The menu is readable before signing in.
app.use("/menu", customerMenuRouter);
app.use("/wallet", customerWalletRouter);
app.use("/orders", customerOrderRouter);

// Kitchen surface. Each router applies authenticate + requireRole("KITCHEN").
app.use("/kitchen/menu", kitchenMenuRouter);
app.use("/kitchen/orders", kitchenOrderRouter);
// Least specific last, or it would swallow the two paths above.
app.use("/kitchen", kitchenRestaurantRouter);

app.use(errorHandler);

initBroker();

// Hosts (Render, Railway) assign the port; 3000 is the local default.
const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
  log.info("listening", { url: `http://localhost:${port}` });
});

onShutdown(log, async () => {
  // Stop accepting requests and let in-flight ones finish, then flush what
  // the outbox can before disconnecting. Anything left stays in the table
  // for the next start.
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await stopBroker();
  await getDb().$disconnect();
});
