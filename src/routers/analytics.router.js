import { Router } from "express";
import {
  getAICategorySuggestion,
  getAIMonthlySummary,
  getDashboard,
  getReports,
} from "../controllers/analytics.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const analyticsRouter = Router();

analyticsRouter.use(requireAuth);
analyticsRouter.get("/dashboard", getDashboard);
analyticsRouter.get("/reports", getReports);
analyticsRouter.post("/ai-category", getAICategorySuggestion);
analyticsRouter.post("/monthly-summary", getAIMonthlySummary);

export default analyticsRouter;
