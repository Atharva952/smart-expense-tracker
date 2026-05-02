import mongoose from "mongoose";
import transactionModel from "../models/transaction.model";
import budgetModel from "../models/budget.model";

const getMonthLabel = (date) =>
  date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });

const monthWindow = (offset) => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset + 1, 0, 23, 59, 59, 999),
  );
  return { start, end };
};

const getSixMonthBuckets = () => {
  const points = [];
  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - i, 1),
    );
    points.push({
      key: start.toISOString().slice(0, 7),
      label: getMonthLabel(start),
      income: 0,
      expense: 0,
    });
  }
  return points;
};

export const getDashboard = async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    const [currentMonthAgg, previousMonthAgg, recentTransactions, monthlyAgg, budgets] =
      await Promise.all([
        transactionModel.aggregate([
          {
            $match: {
              user: userObjectId,
              date: {
                $gte: monthWindow(0).start,
                $lte: monthWindow(0).end,
              },
            },
          },
          {
            $group: {
              _id: "$type",
              total: { $sum: "$amount" },
            },
          },
        ]),
        transactionModel.aggregate([
          {
            $match: {
              user: userObjectId,
              date: {
                $gte: monthWindow(1).start,
                $lte: monthWindow(1).end,
              },
            },
          },
          {
            $group: {
              _id: "$type",
              total: { $sum: "$amount" },
            },
          },
        ]),
        transactionModel.find({ user: req.user.id }).sort({ date: -1 }).limit(7),
        transactionModel.aggregate([
          {
            $match: {
              user: userObjectId,
              date: { $gte: monthWindow(5).start },
            },
          },
          {
            $group: {
              _id: {
                month: { $dateToString: { format: "%Y-%m", date: "$date" } },
                type: "$type",
              },
              total: { $sum: "$amount" },
            },
          },
        ]),
        budgetModel.find({
          user: req.user.id,
          month: new Date().toISOString().slice(0, 7),
        }),
      ]);

    const mapTotals = (agg) => ({
      income: Number(agg.find((x) => x._id === "income")?.total || 0),
      expense: Number(agg.find((x) => x._id === "expense")?.total || 0),
    });

    const current = mapTotals(currentMonthAgg);
    const previous = mapTotals(previousMonthAgg);
    const balance = current.income - current.expense;
    const savings = current.income > 0 ? ((balance / current.income) * 100).toFixed(1) : "0.0";

    const getDelta = (currentValue, previousValue) => {
      if (previousValue === 0) return currentValue === 0 ? 0 : 100;
      return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
    };

    const monthlySeries = getSixMonthBuckets();
    const seriesMap = new Map(monthlySeries.map((p) => [p.key, p]));
    monthlyAgg.forEach((item) => {
      const point = seriesMap.get(item._id.month);
      if (!point) return;
      if (item._id.type === "income") point.income = Number(item.total.toFixed(2));
      if (item._id.type === "expense") point.expense = Number(item.total.toFixed(2));
    });

    const budgetOverview = await Promise.all(
      budgets.map(async (budget) => {
        const { start, end } = monthWindow(0);
        const spentAgg = await transactionModel.aggregate([
          {
            $match: {
              user: userObjectId,
              type: "expense",
              category: budget.category,
              date: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const spent = Number(spentAgg[0]?.total || 0);
        return {
          id: budget._id,
          category: budget.category,
          amount: budget.amount,
          spent,
          progress: budget.amount > 0 ? Number(((spent / budget.amount) * 100).toFixed(2)) : 0,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      cards: {
        totalBalance: Number(balance.toFixed(2)),
        income: Number(current.income.toFixed(2)),
        expenses: Number(current.expense.toFixed(2)),
        savingsRate: Number(savings),
        deltas: {
          balance: getDelta(balance, previous.income - previous.expense),
          income: getDelta(current.income, previous.income),
          expense: getDelta(current.expense, previous.expense),
          savingsRate: Number(savings),
        },
      },
      expenseAnalytics: monthlySeries,
      budgetOverview,
      recentTransactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
};

export const getReports = async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const sixMonthsStart = monthWindow(5).start;

    const [categoryAgg, trendAgg] = await Promise.all([
      transactionModel.aggregate([
        {
          $match: {
            user: userObjectId,
            type: "expense",
            date: { $gte: sixMonthsStart },
          },
        },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
          },
        },
        { $sort: { total: -1 } },
      ]),
      transactionModel.aggregate([
        {
          $match: {
            user: userObjectId,
            date: { $gte: sixMonthsStart },
          },
        },
        {
          $group: {
            _id: {
              month: { $dateToString: { format: "%Y-%m", date: "$date" } },
              type: "$type",
            },
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const totalExpense = categoryAgg.reduce((sum, x) => sum + x.total, 0);
    const categoryData = categoryAgg.map((item) => ({
      category: item._id,
      amount: Number(item.total.toFixed(2)),
      percent:
        totalExpense > 0 ? Number(((item.total / totalExpense) * 100).toFixed(1)) : 0,
    }));

    const trend = getSixMonthBuckets();
    const trendMap = new Map(trend.map((t) => [t.key, t]));
    trendAgg.forEach((item) => {
      const point = trendMap.get(item._id.month);
      if (!point) return;
      if (item._id.type === "income") point.income = Number(item.total.toFixed(2));
      if (item._id.type === "expense") point.expense = Number(item.total.toFixed(2));
    });

    const financialSummary = trend.reduce(
      (acc, point) => {
        acc.totalIncome += point.income;
        acc.totalExpenses += point.expense;
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0 },
    );
    financialSummary.netSavings = Number(
      (financialSummary.totalIncome - financialSummary.totalExpenses).toFixed(2),
    );
    financialSummary.totalIncome = Number(financialSummary.totalIncome.toFixed(2));
    financialSummary.totalExpenses = Number(financialSummary.totalExpenses.toFixed(2));

    return res.status(200).json({
      success: true,
      expenseAnalytics: trend,
      expenseByCategory: categoryData,
      incomeVsExpenseTrend: trend,
      financialSummary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load reports",
    });
  }
};
