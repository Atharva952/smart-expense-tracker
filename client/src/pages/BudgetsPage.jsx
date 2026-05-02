import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CalendarDays, PiggyBank, Target, TrendingUp, Wallet } from "lucide-react";
import { addBudget, fetchBudgets } from "../store/financeSlice";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const BudgetsPage = () => {
  const dispatch = useDispatch();
  const budgets = useSelector((state) => state.finance.budgets);
  const summary = useSelector((state) => state.finance.budgetSummary);
  const [form, setForm] = useState({
    category: "Food & Drinks",
    amount: "",
    month: new Date().toISOString().slice(0, 7),
  });

  useEffect(() => {
    dispatch(fetchBudgets(form.month));
  }, [dispatch, form.month]);

  const submit = async (event) => {
    event.preventDefault();
    await dispatch(addBudget({ ...form, amount: Number(form.amount) }));
    setForm({ ...form, amount: "" });
  };

  const summaryData = {
    totalBudget: Number(summary?.totalBudget || 0),
    totalSpent: Number(summary?.totalSpent || 0),
    totalRemaining: Number(summary?.totalRemaining || 0),
  };

  const spentPercent = useMemo(() => {
    if (!summaryData.totalBudget) return 0;
    return Number(
      ((summaryData.totalSpent / summaryData.totalBudget) * 100).toFixed(1),
    );
  }, [summaryData.totalBudget, summaryData.totalSpent]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-gradient-to-r from-slate-900 via-emerald-900 to-teal-800 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl" />
        <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-teal-300/20 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/90">Budgets</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Monthly Budget Control</h2>
        <p className="mt-2 max-w-2xl text-sm text-emerald-100/90">
          Define category budgets, track spending progress, and stay ahead before
          overspending starts.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card border-none bg-gradient-to-br from-cyan-100 to-blue-50">
          <p className="text-sm font-semibold text-slate-700">Total Budget</p>
          <h3 className="mt-2 text-3xl font-bold text-cyan-800">
            {formatMoney(summaryData.totalBudget)}
          </h3>
        </article>
        <article className="card border-none bg-gradient-to-br from-rose-100 to-orange-50">
          <p className="text-sm font-semibold text-slate-700">Total Spent</p>
          <h3 className="mt-2 text-3xl font-bold text-rose-700">
            {formatMoney(summaryData.totalSpent)}
          </h3>
        </article>
        <article className="card border-none bg-gradient-to-br from-emerald-100 to-lime-50">
          <p className="text-sm font-semibold text-slate-700">Total Remaining</p>
          <h3 className="mt-2 text-3xl font-bold text-emerald-700">
            {formatMoney(summaryData.totalRemaining)}
          </h3>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-5">
        <article className="card border-none bg-gradient-to-br from-white via-white to-emerald-50 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Set Monthly Budget</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              <CalendarDays size={13} />
              Planning
            </span>
          </div>
          <form className="mt-4 grid gap-3" onSubmit={submit}>
            <input
              className="input"
              type="month"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
            />
            <input
              className="input"
              type="text"
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
            <input
              className="input"
              type="number"
              placeholder="Budget amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <button className="btn-primary" type="submit">
              Save Budget
            </button>
          </form>
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
            <p className="text-xs font-semibold text-emerald-800">Current utilization</p>
            <p className="mt-1 text-sm text-emerald-900">
              {spentPercent}% spent in selected month.
            </p>
          </div>
        </article>

        <article className="card xl:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold">Category Progress</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <Target size={13} />
              {budgets.length} budgets
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {budgets.map((budget) => {
              const progress = Math.min(budget.progress, 100);
              const state =
                budget.progress > 90
                  ? "bg-rose-500"
                  : budget.progress > 75
                    ? "bg-amber-500"
                    : "bg-[var(--brand)]";
              return (
                <article
                  key={budget._id}
                  className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                >
                  <div className="mb-1 flex items-center justify-between text-sm font-semibold">
                    <span>{budget.category}</span>
                    <span className="text-[var(--muted)]">
                      {formatMoney(budget.spent)} / {formatMoney(budget.amount)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--soft)]">
                    <div
                      className={`h-2.5 rounded-full transition-all ${state}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>{budget.progress.toFixed(1)}% used</span>
                    <span>{formatMoney(budget.remaining)} remaining</span>
                  </div>
                </article>
              );
            })}

            {!budgets.length ? (
              <p className="rounded-xl bg-[var(--soft)] px-3 py-2 text-sm text-[var(--muted)]">
                No budgets found for this month. Add your first category budget.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card border-none bg-gradient-to-br from-slate-100 to-slate-50">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-slate-700" />
            <p className="text-sm font-semibold text-slate-700">Control Spending</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Set realistic limits for fixed and variable monthly categories.
          </p>
        </article>
        <article className="card border-none bg-gradient-to-br from-cyan-100 to-teal-50">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-800" />
            <p className="text-sm font-semibold text-cyan-800">Healthy Trends</p>
          </div>
          <p className="mt-2 text-sm text-cyan-900/90">
            Monitor category progress regularly to avoid end-of-month surprises.
          </p>
        </article>
        <article className="card border-none bg-gradient-to-br from-emerald-100 to-lime-50">
          <div className="flex items-center gap-2">
            <PiggyBank size={16} className="text-emerald-800" />
            <p className="text-sm font-semibold text-emerald-800">Savings First</p>
          </div>
          <p className="mt-2 text-sm text-emerald-900/90">
            Strong budget discipline protects your savings goals long-term.
          </p>
        </article>
      </section>
    </div>
  );
};

export default BudgetsPage;

