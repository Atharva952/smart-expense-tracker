import { Router } from "express";
import {
  createBudget,
  deleteBudget,
  getBudgets,
} from "../controllers/budget.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const budgetRouter = Router();

budgetRouter.use(requireAuth);
budgetRouter.get("/", getBudgets);
budgetRouter.post("/", createBudget);
budgetRouter.delete("/:id", deleteBudget);

export default budgetRouter;
