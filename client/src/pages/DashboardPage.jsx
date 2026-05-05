import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  CircleDollarSign,
  Layers3,
  ReceiptText,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildMonthlySummary,
  generateMonthlySummaryAI,
  getCategorySuggestion,
  getSmartCategory,
} from "../lib/aiInsights";
import {
  addTransaction,
  fetchDashboard,
  fetchTransactions,
} from "../store/financeSlice";
import TransactionFormCard from "../components/TransactionFormCard";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const deltaLabel = (value) => {
  const numeric = Number(value || 0);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric}% vs last month`;
};

const deltaTone = (delta, isExpense = false) => {
  const value = Number(delta || 0);
  if (value === 0) {
    return {
      text: "text-slate-600",
      chip: "bg-slate-100 text-slate-700",
      Icon: Layers3,
    };
  }
  const isPositive = isExpense ? value < 0 : value > 0;
  return isPositive
    ? {
        text: "text-emerald-700",
        chip: "bg-emerald-100 text-emerald-700",
        Icon: ArrowUpRight,
      }
    : {
        text: "text-rose-700",
        chip: "bg-rose-100 text-rose-700",
        Icon: ArrowDownRight,
      };
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const incomeValue = payload.find((item) => item.dataKey === "income")?.value || 0;
  const expenseValue =
    payload.find((item) => item.dataKey === "expense")?.value || 0;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white/95 px-3 py-2 shadow-md backdrop-blur">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-emerald-700">Income: {formatMoney(incomeValue)}</p>
      <p className="text-xs text-rose-700">Expense: {formatMoney(expenseValue)}</p>
    </div>
  );
};

const DashboardPage = () => {
  const dispatch = useDispatch();
  const dashboard = useSelector((state) => state.finance.dashboard);
  const loading = useSelector((state) => state.finance.loading);
  const transactions = useSelector((state) => state.finance.transactions);

  const [form, setForm] = useState({
    type: "expense",
    category: "",
    amount: "",
    merchant: "",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [aiCategorySuggestion, setAiCategorySuggestion] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);

  useEffect(() => {
    dispatch(fetchDashboard());
    dispatch(fetchTransactions({ limit: 100 }));
  }, [dispatch]);

  const expenseCategoryOptions = useMemo(() => {
    const categories = (dashboard?.budgetOverview ?? []).map((item) =>
      item.category?.trim(),
    );
    return [...new Set(categories.filter(Boolean))];
  }, [dashboard?.budgetOverview]);

  const categoryOptions = useMemo(
    () => (form.type === "income" ? ["Income"] : expenseCategoryOptions),
    [expenseCategoryOptions, form.type],
  );

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      }),
    [transactions],
  );

  const recentSorted = useMemo(() => sortedTransactions.slice(0, 10), [sortedTransactions]);

  const ruleBasedCategorySuggestion = useMemo(
    () =>
      getCategorySuggestion({
        transactions: sortedTransactions,
        type: form.type,
        merchant: form.merchant,
        notes: form.notes,
        categoryOptions,
      }),
    [categoryOptions, form.merchant, form.notes, form.type, sortedTransactions],
  );

  const fallbackMonthlySummary = useMemo(
    () =>
      buildMonthlySummary({
        dashboard,
        transactions: sortedTransactions,
      }),
    [dashboard, sortedTransactions],
  );

  useEffect(() => {
    setAiCategorySuggestion(ruleBasedCategorySuggestion);
  }, [ruleBasedCategorySuggestion]);

  useEffect(() => {
    let isCancelled = false;

    const loadSuggestion = async () => {
      const hasInput =
        String(form.merchant || "").trim() || String(form.notes || "").trim();
      if (!hasInput || form.type !== "expense") {
        if (!isCancelled) setAiCategorySuggestion(ruleBasedCategorySuggestion);
        return;
      }

      const suggestion = await getSmartCategory({
        transactions: sortedTransactions,
        type: form.type,
        merchant: form.merchant,
        notes: form.notes,
        amount: form.amount,
        categoryOptions,
      });

      if (!isCancelled && suggestion) {
        setAiCategorySuggestion(suggestion);
      }
    };

    const timer = setTimeout(loadSuggestion, 350);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    categoryOptions,
    form.amount,
    form.merchant,
    form.notes,
    form.type,
    ruleBasedCategorySuggestion,
    sortedTransactions,
  ]);

  useEffect(() => {
    setMonthlySummary(fallbackMonthlySummary);
  }, [fallbackMonthlySummary]);

  useEffect(() => {
    let isCancelled = false;

    const loadSummary = async () => {
      if (!dashboard?.cards) return;

      const summary = await generateMonthlySummaryAI({
        income: Number(dashboard.cards.income || 0),
        expenses: Number(dashboard.cards.expenses || 0),
        balance: Number(dashboard.cards.totalBalance || 0),
        transactions: sortedTransactions.slice(0, 10),
      });

      if (!isCancelled && summary) {
        setMonthlySummary(summary);
      }
    };

    const timer = setTimeout(loadSummary, 500);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [dashboard?.cards, sortedTransactions]);

  useEffect(() => {
    if (!categoryOptions.length) {
      setForm((prev) => (prev.category ? { ...prev, category: "" } : prev));
      return;
    }
    setForm((prev) =>
      categoryOptions.includes(prev.category)
        ? prev
        : { ...prev, category: categoryOptions[0] },
    );
  }, [categoryOptions]);

  useEffect(() => {
    if (!aiCategorySuggestion) return;
    if (form.type !== "expense") return;
    if (categoryTouched) return;
    if (aiCategorySuggestion.category === form.category) return;
    setForm((prev) => ({ ...prev, category: aiCategorySuggestion.category }));
  }, [aiCategorySuggestion, categoryTouched, form.category, form.type]);

  const cards = [
    {
      label: "Total Balance",
      value: dashboard?.cards?.totalBalance ?? 0,
      tone: "text-[var(--brand-deep)]",
      isCurrency: true,
      Icon: Wallet,
      delta: dashboard?.cards?.deltas?.balance ?? 0,
      accent: "from-cyan-100 to-teal-50",
      isExpense: false,
    },
    {
      label: "Monthly Income",
      value: dashboard?.cards?.income ?? 0,
      tone: "text-emerald-700",
      isCurrency: true,
      Icon: CircleDollarSign,
      delta: dashboard?.cards?.deltas?.income ?? 0,
      accent: "from-emerald-100 to-lime-50",
      isExpense: false,
    },
    {
      label: "Monthly Expenses",
      value: dashboard?.cards?.expenses ?? 0,
      tone: "text-rose-700",
      isCurrency: true,
      Icon: ReceiptText,
      delta: dashboard?.cards?.deltas?.expense ?? 0,
      accent: "from-rose-100 to-orange-50",
      isExpense: true,
    },
    {
      label: "Active Budgets",
      value: dashboard?.budgetOverview?.length ?? 0,
      tone: "text-slate-800",
      isCurrency: false,
      Icon: Layers3,
      delta: 0,
      accent: "from-slate-100 to-slate-50",
      isExpense: false,
    },
  ];

  const isExpenseCategoryMissing =
    form.type === "expense" && !expenseCategoryOptions.length;

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      await dispatch(addTransaction({ ...form, amount: Number(form.amount) }));
      setCategoryTouched(false);
      setForm((prev) => ({
        ...prev,
        amount: "",
        merchant: "",
        notes: "",
      }));
    } catch (error) {
      console.error("Error adding transaction", error);
    }
  };

  const handleTypeChange = (nextType) => {
    setCategoryTouched(false);
    setForm((prev) => ({ ...prev, type: nextType }));
  };

  const handleCategoryChange = (nextCategory) => {
    setCategoryTouched(true);
    setForm((prev) => ({ ...prev, category: nextCategory }));
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-gradient-to-r from-slate-900 via-cyan-900 to-teal-800 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/90">Dashboard</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Financial Command Center</h2>
        <p className="mt-2 max-w-2xl text-sm text-cyan-100/90">
          Track your cash flow, apply AI-driven categorization, and act on monthly
          insights from one place.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const trend = deltaTone(card.delta, card.isExpense);
          const TrendIcon = trend.Icon;
          return (
            <article
              key={card.label}
              className={`card overflow-hidden border-transparent bg-gradient-to-br ${card.accent}`}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-slate-700">{card.label}</p>
                <div className="rounded-xl bg-white/80 p-2 text-slate-700 shadow-sm">
                  <card.Icon size={18} />
                </div>
              </div>
              <h3 className={`mt-4 text-3xl font-bold ${card.tone}`}>
                {card.isCurrency
                  ? formatMoney(card.value)
                  : Number(card.value).toLocaleString()}
              </h3>
              <div className="mt-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${trend.chip}`}
                >
                  <TrendIcon size={14} />
                  {deltaLabel(card.delta)}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      {monthlySummary ? (
        <section className="card border-none bg-gradient-to-r from-white via-cyan-50 to-emerald-50 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-cyan-100 p-2 text-cyan-800">
              <BrainCircuit size={18} />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                {monthlySummary.title}
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {monthlySummary.headline}
              </p>
              <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                {monthlySummary.details.map((detail) => (
                  <p key={detail} className="flex items-start gap-2">
                    <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-cyan-600" />
                    <span>{detail}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">Expense Analytics</h2>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <span className="block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Income
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-700">
              <span className="block h-2.5 w-2.5 rounded-full bg-rose-500" />
              Expense
            </span>
          </div>
        </div>
        <div className="mt-4 h-80 rounded-2xl border border-[var(--line)] bg-white/65 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard?.expenseAnalytics ?? []}>
              <CartesianGrid strokeDasharray="4 4" stroke="#d6e2ef" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "rgba(15,118,110,0.07)" }} content={<ChartTooltip />} />
              <Bar dataKey="expense" fill="#ef4444" radius={[10, 10, 0, 0]} />
              <Bar dataKey="income" fill="#22c55e" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="card">
          <h3 className="font-display text-2xl font-bold">Budget Overview</h3>
          <div className="mt-4 space-y-4">
            {(dashboard?.budgetOverview ?? []).map((item) => {
              const progress = Math.min(item.progress, 100);
              const progressColor =
                item.progress >= 100 ? "bg-rose-500" : "bg-[var(--brand)]";
              return (
                <div key={item.id} className="rounded-2xl border border-[var(--line)] p-3">
                  <div className="mb-1 flex items-center justify-between text-sm font-semibold">
                    <span>{item.category}</span>
                    <span className="text-[var(--muted)]">
                      {formatMoney(item.spent)} / {formatMoney(item.amount)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--soft)]">
                    <div
                      className={`h-2.5 rounded-full transition-all ${progressColor}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--muted)]">
                    {item.progress.toFixed(1)}% used
                  </p>
                </div>
              );
            })}
            {!dashboard?.budgetOverview?.length ? (
              <p className="rounded-xl bg-[var(--soft)] px-3 py-2 text-sm text-[var(--muted)]">
                No budgets added for this month yet.
              </p>
            ) : null}
          </div>
        </article>

        <TransactionFormCard
          variant="cyan"
          subtitle="AI auto-suggests category from merchant and note patterns."
          form={form}
          categoryOptions={categoryOptions}
          isExpenseCategoryMissing={isExpenseCategoryMissing}
          aiCategorySuggestion={aiCategorySuggestion}
          loading={loading}
          onSubmit={onSubmit}
          onTypeChange={handleTypeChange}
          onCategoryChange={handleCategoryChange}
          onFieldChange={(field, value) =>
            setForm((prev) => ({ ...prev, [field]: value }))
          }
          onApplySuggestion={() => {
            setCategoryTouched(false);
            setForm((prev) => ({
              ...prev,
              category: aiCategorySuggestion.category,
            }));
          }}
        />
      </section>

      <section className="card">
        <h3 className="font-display text-2xl font-bold">Recent Transactions</h3>
        <div
          className={`mt-4 space-y-3 ${
            recentSorted.length > 10 ? "max-h-[700px] overflow-y-auto pr-1" : ""
          }`}
        >
          {recentSorted.map((tx) => {
            const isIncome = tx.type === "income";
            return (
              <div
                key={tx._id}
                className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-4 py-3 transition hover:border-cyan-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      isIncome
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {isIncome ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {tx.merchant || tx.category}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {tx.category} • {formatDate(tx.date)}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-sm font-bold ${
                    isIncome ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {formatMoney(tx.amount)}
                </p>
              </div>
            );
          })}
          {!recentSorted.length ? (
            <p className="rounded-xl bg-[var(--soft)] px-3 py-2 text-sm text-[var(--muted)]">
              No recent transactions yet. Add one to start tracking.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
