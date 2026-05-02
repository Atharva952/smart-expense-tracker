import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  otpHash: {
    type: String,
  },
  otpExpiry: {
    type: Date,
  },
  otpAttempts: {
    type: Number,
    default: 0,
  },
  otpLastSentAt: {
    type: Date,
  },
  avatar: {
    type: String,
  },
  currency: {
    type: String,
    default: "INR",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const userModel = mongoose.model("user", userSchema);
export default userModel;
