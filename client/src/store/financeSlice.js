import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../lib/api";

export const fetchDashboard = createAsyncThunk(
  "finance/fetchDashboard",
  async () => {
    const { data } = await api.get("/analytics/dashboard");
    // ✅ Unwrap nested response: { success, data: { totalBalance, ... } }
    return data.data ?? data;
  },
);

export const fetchReports = createAsyncThunk(
  "finance/fetchReports",
  async () => {
    const { data } = await api.get("/analytics/reports");
    return data.data ?? data;
  },
);

export const fetchTransactions = createAsyncThunk(
  "finance/fetchTransactions",
  async (params = {}) => {
    const { data } = await api.get("/transactions", { params });
    // ✅ Unwrap if needed; keeps { transactions, pagination } shape
    return data.data ?? data;
  },
);

export const addTransaction = createAsyncThunk(
  "finance/addTransaction",
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post("/transactions", payload);
      if (response.data.success) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await Promise.all([
          dispatch(fetchDashboard()),
          dispatch(fetchTransactions()),
        ]);
        const tx = response.data.transaction ?? response.data.data?.transaction;
        if (tx) {
          dispatch(transactionAdded(tx));
        }
      }
      return response.data;
    } catch (error) {
      console.error("Add transaction error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to add transaction",
      );
    }
  },
);

export const fetchBudgets = createAsyncThunk(
  "finance/fetchBudgets",
  async (month, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/budgets", {
        params: month ? { month } : {},
      });
      return data.data ?? data;
    } catch (error) {
      return rejectWithValue("Failed to fetch budgets");
    }
  },
);

export const addBudget = createAsyncThunk(
  "finance/addBudget",
  async (payload, { dispatch }) => {
    await api.post("/budgets", payload);
    await Promise.all([
      dispatch(fetchBudgets(payload.month)),
      dispatch(fetchDashboard()),
    ]);
  },
);

const financeSlice = createSlice({
  name: "finance",
  initialState: {
    dashboard: null,
    reports: null,
    transactions: [],
    transactionsPagination: null,
    budgets: [],
    budgetSummary: null,
    loading: false,
    error: "",
  },
  reducers: {
    transactionAdded(state, action) {
      const tx = action.payload;
      if (!tx || !tx._id) return;
      if (!state.dashboard) {
        state.dashboard = { recentTransactions: [tx] };
        return;
      }
      const existing = state.dashboard.recentTransactions || [];
      if (existing.find((t) => t._id === tx._id)) return;
      state.dashboard.recentTransactions = [tx, ...existing].slice(0, 7);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Failed to fetch dashboard";
        console.error("Dashboard fetch error:", action.error);
      })
      .addCase(addTransaction.pending, (state) => {
        state.loading = true;
      })
      .addCase(addTransaction.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addTransaction.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.reports = action.payload;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload.transactions ?? [];
        state.transactionsPagination = action.payload.pagination ?? null;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.budgets = action.payload.budgets ?? [];
        state.budgetSummary = action.payload.summary ?? null;
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { transactionAdded } = financeSlice.actions;
export default financeSlice.reducer;
