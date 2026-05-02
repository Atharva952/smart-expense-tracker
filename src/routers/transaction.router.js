import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from "../controllers/transaction.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const transactionRouter = Router();

transactionRouter.use(requireAuth);
transactionRouter.get("/", getTransactions);
transactionRouter.post("/", createTransaction);
transactionRouter.put("/:id", updateTransaction);
transactionRouter.delete("/:id", deleteTransaction);

export default transactionRouter;
