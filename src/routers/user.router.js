import { Router } from "express";
import {
  register,
  verifyEmailOtp,
  resendOtp,
  refreshToken,
  login,
  logout,
  logoutAll,
  getMe,
} from "../controllers/user.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const userRouter = Router();

userRouter.post("/register", register);
userRouter.post("/verify-email", verifyEmailOtp);
userRouter.post("/resend-otp", resendOtp);
userRouter.post("/login", login);
userRouter.get("/me", requireAuth, getMe);
userRouter.get("/refresh-token", refreshToken);
userRouter.post("/logout", logout);
userRouter.post("/logout-all", logoutAll);
export default userRouter;
