import transactionModel from "../models/transaction.model";

export const createTransaction = async (req, res) => {
  try {
    const { type, category, amount, merchant, notes, date } = req.body;
    if (!type || !category || !amount) {
      return res.status(400).json({
        success: false,
        message: "type, category and amount are required",
      });
    }

    const transaction = await transactionModel.create({
      user: req.user.id,
      type,
      category,
      amount: Number(amount),
      merchant: merchant || "",
      notes: notes || "",
      date: date ? new Date(date) : new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Transaction added",
      transaction,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add transaction",
    });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      type,
      category,
      startDate,
      endDate,
    } = req.query;

    const filter = {
      user: req.user.id,
    };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      transactionModel
        .find(filter)
        .sort({ date: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      transactionModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      transactions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
    });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const transaction = await transactionModel.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
      },
      {
        ...req.body,
      },
      { new: true },
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction updated",
      transaction,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update transaction",
    });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await transactionModel.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete transaction",
    });
  }
};
