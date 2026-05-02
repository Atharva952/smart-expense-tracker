import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    month: {
      type: String,
      required: true,
      default: () => new Date().toISOString().slice(0, 7),
    },
  },
  {
    timestamps: true,
  },
);

budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

const budgetModel = mongoose.model("budget", budgetSchema);
export default budgetModel;
