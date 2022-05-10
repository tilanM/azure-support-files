import compression from "compression";
import express from "express";
import helmet from "helmet";
import httpStatus from "http-status";
import serverlessHttp from "serverless-http";

import interop from "./routes/interop.mjs";
import { authMiddleware } from "./middleware/auth.mjs";

const app = express();
const comp = compression();

app.use(comp);
app.use(express.json());
app.use(helmet());

app.get("/", (_, res) => res.sendStatus(httpStatus.OK));

app.get("/auth", authMiddleware, (_, res) => res.sendStatus(httpStatus.OK));

app.use("/interop", authMiddleware, interop);

app.use((err, _, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.statusCode || 500).json({
    error: err.message,
  });
});

const handler = serverlessHttp(app);

export { handler, app };
