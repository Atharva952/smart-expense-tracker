import { Router } from "express";
import {
  getDashboard,
  getReports,
} from "../controllers/analytics.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const analyticsRouter = Router();

analyticsRouter.use(requireAuth);
analyticsRouter.get("/dashboard", getDashboard);
analyticsRouter.get("/reports", getReports);

export default analyticsRouter;
