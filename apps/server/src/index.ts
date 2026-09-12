import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./env.server";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./modules/auth/auth.routes";

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
  res.status(200).json({ status: "ok" });
});

app.use("/auth", authRouter);

app.use(errorHandler);

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
