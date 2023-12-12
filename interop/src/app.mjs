import express from "express";
import httpStatus from "http-status";
import serverlessHttp from "serverless-http";

import interop from "./routes/interop.mjs";
import { authMiddleware } from "./middleware/auth.mjs";

const app = express();
app.use(express.json({ limit: "25mb" }));

app.get("/", (_, res) => res.sendStatus(httpStatus.OK));

app.get("/auth", authMiddleware, (_, res) => res.sendStatus(httpStatus.OK));

app.use("/interop", interop);

app.use((err, _, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.statusCode || 500).json({
    error: err.message,
  });
});

// const PORT = 3000;

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

const handler = serverlessHttp(app, { provider: "azure" });

async function azureHandler(context, req) {
  context.res = await handler(context, req);
}

export { azureHandler, app };
