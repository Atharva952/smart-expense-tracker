import jwt from "jsonwebtoken";
import crypto from "crypto";
import sessionModel from "../models/session.model";

const ACCESS_TOKEN_AGE = "15m";
const REFRESH_TOKEN_AGE = "7d";
const isProduction = process.env.NODE_ENV === "production";

export const signAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_AGE,
  });
};

export const signRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_AGE,
  });
};

export const getRefreshTokenHash = (refreshToken) => {
  return crypto.createHash("sha256").update(refreshToken).digest("hex");
};

export const cookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export const issueSessionTokens = async ({ userId, req, res }) => {
  const refreshToken = signRefreshToken({ id: userId });
  const refreshTokenHash = getRefreshTokenHash(refreshToken);

  const session = await sessionModel.create({
    user: userId,
    refreshTokenHash,
    ip: req.ip || "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
  });

  const accessToken = signAccessToken({
    id: userId,
    sessionId: session._id,
  });

  res.cookie("refreshToken", refreshToken, cookieOptions());
  return { accessToken };
};
