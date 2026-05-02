import jwt from "jsonwebtoken";
import sessionModel from "../models/session.model";

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id || !decoded?.sessionId) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    const session = await sessionModel.findOne({
      _id: decoded.sessionId,
      user: decoded.id,
      revoked: false,
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    req.user = {
      id: decoded.id,
      sessionId: decoded.sessionId,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};
