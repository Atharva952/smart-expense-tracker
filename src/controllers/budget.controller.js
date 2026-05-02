import budgetModel from "../models/budget.model";
import transactionModel from "../models/transaction.model";
import mongoose from "mongoose";

const getMonthRange = (month) => {
  const [year, monthValue] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthValue - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthValue, 0, 23, 59, 59, 999));
  return { start, end };
};

const computeSpentByCategory = async ({ userId, month }) => {
  const { start, end } = getMonthRange(month);
  const result = await transactionModel.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: "expense",
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$category",
        spent: { $sum: "$amount" },
      },
    },
  ]);

  return new Map(result.map((item) => [item._id, item.spent]));
};

export const createBudget = async (req, res) => {
  try {
    const { category, amount, month } = req.body;
    if (!category || !amount) {
      return res.status(400).json({
        success: false,
        message: "category and amount are required",
      });
    }

    const effectiveMonth = month || new Date().toISOString().slice(0, 7);
    const budget = await budgetModel.findOneAndUpdate(
      {
        user: req.user.id,
        category,
        month: effectiveMonth,
      },
      {
        amount: Number(amount),
      },
      {
        new: true,
        upsert: true,
      },
    );

    return res.status(201).json({
      success: true,
      message: "Budget saved",
      budget,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save budget",
    });
  }
};

export const getBudgets = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const budgets = await budgetModel
      .find({
        user: req.user.id,
        month,
      })
      .sort({ category: 1 });

    const spentByCategory = await computeSpentByCategory({
      userId: req.user.id,
      month,
    });

    const enrichedBudgets = budgets.map((budget) => {
      const spent = Number(spentByCategory.get(budget.category) || 0);
      const remaining = budget.amount - spent;
      const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        ...budget.toObject(),
        spent,
        remaining,
        progress: Number(progress.toFixed(2)),
      };
    });

    return res.status(200).json({
      success: true,
      month,
      budgets: enrichedBudgets,
      summary: {
        totalBudget: enrichedBudgets.reduce((sum, b) => sum + b.amount, 0),
        totalSpent: enrichedBudgets.reduce((sum, b) => sum + b.spent, 0),
        totalRemaining: enrichedBudgets.reduce((sum, b) => sum + b.remaining, 0),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch budgets",
    });
  }
};

export const deleteBudget = async (req, res) => {
  try {
    const budget = await budgetModel.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Budget deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete budget",
    });
  }
};
