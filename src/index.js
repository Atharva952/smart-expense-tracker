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

const normalizeOrigin = (origin = "") => origin.trim().replace(/\/+$/, "");

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://smart-expense-tracker-frontend-2.onrender.com",
  "https://smart-expense-tracker-frontend1.onrender.com",
];

const configuredOrigins = [
  ...defaultOrigins,
  process.env.CLIENT_URLS,
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.FRONTEND_ORIGIN,
]
  .filter(Boolean)
  .flatMap((origins) => origins.split(","))
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);
    const isConfigured = configuredOrigins.includes(normalizedOrigin);
    const isLocalhostDev = /^http:\/\/localhost:\d+$/.test(normalizedOrigin);
    const isRenderFrontend =
      /^https:\/\/smart-expense-tracker-frontend[-\w]*\.onrender\.com$/i.test(
        normalizedOrigin,
      );

    if (isConfigured || isLocalhostDev || isRenderFrontend) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

const port = process.env.PORT;
const db = process.env.DB_STRING;
const dbName = process.env.DB_NAME;

const requiredEnvVars = ["PORT", "DB_STRING", "DB_NAME", "JWT_SECRET", "SALT"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
  process.exit(1);
}

mongoose.set("bufferCommands", false);

app.use("/api/v1/user", userRouter);
app.use("/api/v1/transactions", transactionRouter);
app.use("/api/v1/budgets", budgetRouter);
app.use("/api/v1/analytics", analyticsRouter);

app.get("/", (req, res) => {
  res.send("API Working");
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await mongoose.connect(db, {
      dbName,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log(`mongodb is connected (${dbName})`);

    app.listen(port, () => {
      console.log(`server is running on ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect MongoDB:", error.message);
    process.exit(1);
  }
};

startServer();
