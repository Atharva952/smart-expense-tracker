import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRouter from "./routers/user.router";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import transactionRouter from "./routers/transaction.router";
import budgetRouter from "./routers/budget.router";
import analyticsRouter from "./routers/analytics.router";
import errorHandler from "./utils/asyncHandler";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

const configuredOrigins = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients/tools without Origin header.
      if (!origin) return callback(null, true);

      const isConfigured = configuredOrigins.includes(origin);
      const isLocalhostDev = /^http:\/\/localhost:\d+$/.test(origin);

      if (isConfigured || isLocalhostDev) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

const port = process.env.PORT;
const db = process.env.DB_STRING;
const dbName = process.env.DB_NAME;

mongoose
  .connect(db, { dbName })
  .then((res) => {
    console.log(`mongodb is connected (${dbName}) `);
  })
  .catch((err) => {
    console.log(err);
  });

app.use("/api/v1/user", userRouter);
app.use("/api/v1/transactions", transactionRouter);
app.use("/api/v1/budgets", budgetRouter);
app.use("/api/v1/analytics", analyticsRouter);

app.get("/", (req, res) => {
  res.send("API Working");
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
