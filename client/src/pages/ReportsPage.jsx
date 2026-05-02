import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  PieChart as PieIcon,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchReports } from "../store/financeSlice";

const palette = [
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#14b8a6",
  "#6366f1",
];

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatCompact = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const income = payload.find((item) => item.dataKey === "income")?.value || 0;
  const expense = payload.find((item) => item.dataKey === "expense")?.value || 0;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white/95 px-3 py-2 shadow-md backdrop-blur">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-emerald-700">Income: {formatMoney(income)}</p>
      <p className="text-xs text-rose-700">Expense: {formatMoney(expense)}</p>
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white/95 px-3 py-2 shadow-md backdrop-blur">
      <p className="text-xs font-semibold text-slate-800">{item.category}</p>
      <p className="mt-1 text-xs text-slate-700">{formatMoney(item.amount)}</p>
      <p className="text-xs text-slate-500">{item.percent}% of total expense</p>
    </div>
  );
};

const ReportsPage = () => {
  const dispatch = useDispatch();
  const reports = useSelector((state) => state.finance.reports);

  useEffect(() => {
    dispatch(fetchReports());
  }, [dispatch]);

  const financialSummary = reports?.financialSummary || {
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
  };

  const savingsRate = useMemo(() => {
    if (!financialSummary.totalIncome) return 0;
    return Number(
      ((financialSummary.netSavings / financialSummary.totalIncome) * 100).toFixed(1),
    );
  }, [financialSummary.netSavings, financialSummary.totalIncome]);

  const savingsPositive = savingsRate >= 0;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-blue-300/20 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/90">Reports</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Trends & Deep Insights</h2>
        <p className="mt-2 max-w-2xl text-sm text-cyan-100/90">
          Analyze your last 6 months of spending patterns, category distribution,
          and savings momentum.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card border-none bg-gradient-to-br from-emerald-100 to-lime-50">
          <p className="text-sm font-semibold text-slate-700">Total Income</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {formatMoney(financialSummary.totalIncome)}
          </p>
          <p className="mt-2 text-xs text-slate-600">Last 6 months</p>
        </article>
        <article className="card border-none bg-gradient-to-br from-rose-100 to-orange-50">
          <p className="text-sm font-semibold text-slate-700">Total Expenses</p>
          <p className="mt-2 text-3xl font-bold text-rose-700">
            {formatMoney(financialSummary.totalExpenses)}
          </p>
          <p className="mt-2 text-xs text-slate-600">Last 6 months</p>
        </article>
        <article className="card border-none bg-gradient-to-br from-cyan-100 to-blue-50">
          <p className="text-sm font-semibold text-slate-700">Net Savings</p>
          <p
            className={`mt-2 text-3xl font-bold ${
              financialSummary.netSavings >= 0 ? "text-cyan-800" : "text-rose-700"
            }`}
          >
            {formatMoney(financialSummary.netSavings)}
          </p>
          <p
            className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              savingsPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            {savingsPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {savingsRate}% savings rate
          </p>
        </article>
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Income vs Expense (Monthly)</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800">
            <ChartNoAxesCombined size={13} />
            6M trend
          </span>
        </div>
        <div className="mt-4 h-80 rounded-2xl border border-[var(--line)] bg-white/70 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reports?.expenseAnalytics || []}>
              <CartesianGrid strokeDasharray="4 4" stroke="#d6e2ef" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCompact} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "rgba(6,182,212,0.08)" }} content={<TrendTooltip />} />
              <Legend />
              <Bar dataKey="income" fill="#22c55e" radius={[10, 10, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="card border-none bg-gradient-to-br from-white via-cyan-50 to-blue-50">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl font-bold">Expense by Category</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-cyan-700 shadow-sm">
              <PieIcon size={13} />
              Distribution
            </span>
          </div>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reports?.expenseByCategory || []}
                  dataKey="amount"
                  nameKey="category"
                  outerRadius={120}
                  label={(item) => `${item.category} ${item.percent}%`}
                >
                  {(reports?.expenseByCategory || []).map((item, idx) => (
                    <Cell key={item.category} fill={palette[idx % palette.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card border-none bg-gradient-to-br from-white via-emerald-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl font-bold">Income vs Expense Trend</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
              <Sparkles size={13} />
              Direction
            </span>
          </div>
          <div className="mt-4 h-80 rounded-2xl border border-[var(--line)] bg-white/70 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reports?.incomeVsExpenseTrend || []}>
                <CartesianGrid strokeDasharray="4 4" stroke="#d6e2ef" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatCompact} tickLine={false} axisLine={false} />
                <Tooltip content={<TrendTooltip />} />
                <Legend />
                <Line
                  dataKey="income"
                  stroke="#22c55e"
                  strokeWidth={3}
                  type="monotone"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={3}
                  type="monotone"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </div>
  );
};

export default ReportsPage;

