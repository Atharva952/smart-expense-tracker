import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/user.model";
import sessionModel from "../models/session.model";
import { generateOtp, hashOtp } from "../utils/otp";
import { sendOtpEmail } from "../utils/email";
import {
  cookieOptions,
  getRefreshTokenHash,
  issueSessionTokens,
  signAccessToken,
  signRefreshToken,
} from "../utils/token";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const httpError = (message, code = 400) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  isEmailVerified: user.isEmailVerified,
});

const sendVerificationOtp = async (user, force = false) => {
  const now = Date.now();
  if (
    !force &&
    user.otpLastSentAt &&
    now - user.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    const remainingSeconds = Math.ceil(
      (OTP_RESEND_COOLDOWN_MS - (now - user.otpLastSentAt.getTime())) / 1000,
    );
    throw httpError(
      `Please wait ${remainingSeconds}s before requesting OTP`,
      429,
    );
  }

  const otp = generateOtp();
  user.otpHash = hashOtp(otp);
  user.otpExpiry = new Date(now + OTP_EXPIRY_MS);
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date(now);
  await user.save();

  return sendOtpEmail({
    to: user.email,
    name: user.name,
    otp,
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email and password are required",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existing = await userModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const salt = Number(process.env.SALT || 10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const user = await userModel.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      isEmailVerified: false,
    });

    const emailResult = await sendVerificationOtp(user, true);

    return res.status(201).json({
      success: true,
      message:
        emailResult.mode === "smtp"
          ? "Registration successful. OTP sent to your email."
          : "Registration successful. OTP logged in server console (SMTP not configured).",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(error.code || 500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "email and otp are required",
      });
    }

    const user = await userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: "Email already verified. Please login to continue.",
        user: sanitizeUser(user),
      });
    }

    if (!user.otpHash || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "No OTP requested. Please request a new OTP.",
      });
    }

    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please request a new OTP.",
      });
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP.",
      });
    }

    const isValidOtp = hashOtp(otp) === user.otpHash;
    if (!isValidOtp) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.isEmailVerified = true;
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    await user.save();

    const { accessToken } = await issueSessionTokens({
      userId: user._id,
      req,
      res,
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: sanitizeUser(user),
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "OTP verification failed",
    });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required",
      });
    }

    const user = await userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    const emailResult = await sendVerificationOtp(user);

    return res.status(200).json({
      success: true,
      message:
        emailResult.mode === "smtp"
          ? "OTP sent successfully"
          : "OTP regenerated and logged in server console",
    });
  } catch (error) {
    return res.status(error.code || 400).json({
      success: false,
      message: error.message || "Failed to resend OTP",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isEmailVerified) {
      const hasActiveOtp =
        user.otpHash && user.otpExpiry && user.otpExpiry.getTime() > Date.now();
      const inCooldownWindow =
        user.otpLastSentAt &&
        Date.now() - user.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS;

      if (hasActiveOtp && inCooldownWindow) {
        return res.status(403).json({
          success: false,
          requiresOtpVerification: true,
          message:
            "OTP already sent recently. Please check your inbox and verify your email.",
        });
      }

      let emailResult = null;
      try {
        emailResult = await sendVerificationOtp(user);
      } catch (otpError) {
        return res.status(otpError.code || 429).json({
          success: false,
          requiresOtpVerification: true,
          message: otpError.message || "Unable to send OTP right now",
        });
      }

      return res.status(403).json({
        success: false,
        requiresOtpVerification: true,
        message:
          emailResult.mode === "smtp"
            ? "Please verify your email with OTP."
            : "Please verify your email. OTP logged in server console.",
      });
    }

    const { accessToken } = await issueSessionTokens({
      userId: user._id,
      req,
      res,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: sanitizeUser(user),
      accessToken,
    });
  } catch (error) {
    return res.status(error.code || 500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch user",
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
    }

    const decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);
    const refreshTokenHash = getRefreshTokenHash(oldRefreshToken);

    const session = await sessionModel.findOne({
      refreshTokenHash,
      revoked: false,
      user: decoded.id,
    });
    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const accessToken = signAccessToken({
      id: decoded.id,
      sessionId: session._id,
    });

    const newRefreshToken = signRefreshToken({ id: decoded.id });
    session.refreshTokenHash = getRefreshTokenHash(newRefreshToken);
    await session.save();

    res.cookie("refreshToken", newRefreshToken, cookieOptions());

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (refreshToken) {
      const refreshTokenHash = getRefreshTokenHash(refreshToken);
      await sessionModel.updateOne(
        {
          refreshTokenHash,
          revoked: false,
        },
        {
          revoked: true,
        },
      );
    } else if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        if (decoded?.id && decoded?.sessionId) {
          await sessionModel.updateOne(
            {
              _id: decoded.sessionId,
              user: decoded.id,
              revoked: false,
            },
            {
              revoked: true,
            },
          );
        }
      } catch (error) {
        // Intentionally ignore invalid/expired access token during logout.
      }
    }

    res.clearCookie("refreshToken", cookieOptions());

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

export const logoutAll = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token not found",
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    await sessionModel.updateMany(
      {
        user: decoded.id,
        revoked: false,
      },
      {
        revoked: true,
      },
    );

    res.clearCookie("refreshToken", cookieOptions());
    return res.status(200).json({
      success: true,
      message: "Logged out from all devices successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout all failed",
    });
  }
};
