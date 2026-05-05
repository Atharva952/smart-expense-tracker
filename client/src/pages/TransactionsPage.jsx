import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Landmark,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { getCategorySuggestion, getSmartCategory } from "../lib/aiInsights";
import {
  addTransaction,
  fetchBudgets,
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

const TransactionsPage = () => {
  const dispatch = useDispatch();
  const transactions = useSelector((state) => state.finance.transactions);
  const budgets = useSelector((state) => state.finance.budgets);

  const expenseCategoryOptions = useMemo(() => {
    const categories = (budgets || []).map((b) => b.category?.trim());
    return [...new Set(categories.filter(Boolean))];
  }, [budgets]);

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

  const categoryOptions = useMemo(
    () => (form.type === "income" ? ["Income"] : expenseCategoryOptions),
    [form.type, expenseCategoryOptions],
  );

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

  const FETCH_PARAMS = { limit: 1000, sort: "-createdAt" };

  useEffect(() => {
    dispatch(fetchTransactions(FETCH_PARAMS));
    dispatch(fetchBudgets());
  }, [dispatch]);

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        const createdDiff =
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime();
        if (createdDiff !== 0) return createdDiff;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }),
    [transactions],
  );

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
    if (!aiCategorySuggestion) return;
    if (form.type !== "expense") return;
    if (categoryTouched) return;
    if (aiCategorySuggestion.category === form.category) return;
    setForm((prev) => ({ ...prev, category: aiCategorySuggestion.category }));
  }, [aiCategorySuggestion, categoryTouched, form.category, form.type]);

  const isExpenseCategoryMissing =
    form.type === "expense" && !expenseCategoryOptions.length;

  const stats = useMemo(() => {
    return sortedTransactions.reduce(
      (acc, tx) => {
        if (tx.type === "income") acc.income += Number(tx.amount || 0);
        if (tx.type === "expense") acc.expense += Number(tx.amount || 0);
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [sortedTransactions]);

  const submit = async (event) => {
    event.preventDefault();
    await dispatch(addTransaction({ ...form, amount: Number(form.amount) }));
    dispatch(fetchTransactions(FETCH_PARAMS));
    setCategoryTouched(false);
    setForm((prev) => ({ ...prev, amount: "", merchant: "", notes: "" }));
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
      <section className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-gradient-to-r from-slate-900 via-violet-900 to-fuchsia-800 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-fuchsia-300/20 blur-2xl" />
        <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-violet-300/20 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-100/90">
          Transactions
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold">Money Movement Center</h2>
        <p className="mt-2 max-w-2xl text-sm text-fuchsia-100/90">
          Add income or expenses with AI-assisted categorization and monitor all
          recent entries in one timeline.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card border-none bg-gradient-to-br from-emerald-100 to-lime-50">
          <p className="text-sm font-semibold text-slate-700">Total Income (Shown)</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{formatMoney(stats.income)}</p>
        </article>
        <article className="card border-none bg-gradient-to-br from-rose-100 to-orange-50">
          <p className="text-sm font-semibold text-slate-700">Total Expense (Shown)</p>
          <p className="mt-2 text-3xl font-bold text-rose-700">{formatMoney(stats.expense)}</p>
        </article>
        <article className="card border-none bg-gradient-to-br from-cyan-100 to-blue-50">
          <p className="text-sm font-semibold text-slate-700">Net Flow (Shown)</p>
          <p
            className={`mt-2 text-3xl font-bold ${
              stats.income - stats.expense >= 0 ? "text-cyan-800" : "text-rose-700"
            }`}
          >
            {formatMoney(stats.income - stats.expense)}
          </p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <TransactionFormCard
            variant="fuchsia"
            subtitle="AI suggestion learns from your previous merchant and notes patterns."
            form={form}
            categoryOptions={categoryOptions}
            isExpenseCategoryMissing={isExpenseCategoryMissing}
            aiCategorySuggestion={aiCategorySuggestion}
            onSubmit={submit}
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
        </div>

        <article className="card xl:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold">Recent Transactions</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <ReceiptText size={13} />
              {sortedTransactions.length} entries
            </span>
          </div>
          <div
            className={`mt-4 space-y-3 ${
              sortedTransactions.length > 10 ? "max-h-[700px] overflow-y-auto pr-1" : ""
            }`}
          >
            {sortedTransactions.map((tx) => {
              const isIncome = tx.type === "income";
              return (
                <div
                  key={tx._id}
                  className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-4 py-3 transition hover:border-fuchsia-200 hover:shadow-sm"
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

            {!sortedTransactions.length ? (
              <p className="rounded-xl bg-[var(--soft)] px-3 py-2 text-sm text-[var(--muted)]">
                No transactions yet. Add one to start tracking.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card border-none bg-gradient-to-br from-slate-100 to-slate-50">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-slate-700" />
            <p className="text-sm font-semibold text-slate-700">Cash Management</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Keep transactions up to date for more accurate budgets and insights.
          </p>
        </article>
        <article className="card border-none bg-gradient-to-br from-cyan-100 to-teal-50">
          <div className="flex items-center gap-2">
            <BrainCircuit size={16} className="text-cyan-800" />
            <p className="text-sm font-semibold text-cyan-800">AI Assist</p>
          </div>
          <p className="mt-2 text-sm text-cyan-900/90">
            Suggestion quality improves as your transaction history grows.
          </p>
        </article>
        <article className="card border-none bg-gradient-to-br from-indigo-100 to-violet-50">
          <div className="flex items-center gap-2">
            <Landmark size={16} className="text-indigo-800" />
            <p className="text-sm font-semibold text-indigo-800">Financial Discipline</p>
          </div>
          <p className="mt-2 text-sm text-indigo-900/90">
            Review recent entries often to catch missing or miscategorized spends.
          </p>
        </article>
      </section>
    </div>
  );
};

export default TransactionsPage;
