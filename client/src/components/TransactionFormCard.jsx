import { CalendarDays, FileText, HandCoins, Sparkles, Store, Tags } from "lucide-react";

const variants = {
  cyan: {
    card: "border-none bg-gradient-to-br from-white via-white to-cyan-50",
    chip: "bg-cyan-100 text-cyan-800",
    label: "text-cyan-900/80",
    aiBox: "border-cyan-200 bg-cyan-50/80",
    aiText: "text-cyan-900",
    aiSubtext: "text-cyan-800/80",
    aiButton: "bg-cyan-700 hover:bg-cyan-800",
  },
  fuchsia: {
    card: "border-none bg-gradient-to-br from-white via-white to-fuchsia-50",
    chip: "bg-fuchsia-100 text-fuchsia-800",
    label: "text-fuchsia-900/80",
    aiBox: "border-fuchsia-200 bg-fuchsia-50/80",
    aiText: "text-fuchsia-900",
    aiSubtext: "text-fuchsia-800/80",
    aiButton: "bg-fuchsia-700 hover:bg-fuchsia-800",
  },
};

const Field = ({
  label,
  icon: Icon,
  children,
  span = "sm:col-span-1",
}) => (
  <label className={`${span} block`}>
    <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
      <Icon size={13} />
      {label}
    </span>
    {children}
  </label>
);

const TransactionFormCard = ({
  variant = "cyan",
  subtitle,
  form,
  categoryOptions,
  isExpenseCategoryMissing,
  aiCategorySuggestion,
  loading = false,
  onSubmit,
  onTypeChange,
  onCategoryChange,
  onFieldChange,
  onApplySuggestion,
}) => {
  const theme = variants[variant] || variants.cyan;

  return (
    <article className={`card ${theme.card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-bold">Add New Transaction</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {subtitle || "AI suggestion learns from your previous merchant and notes patterns."}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${theme.chip}`}
        >
          <Sparkles size={13} />
          AI Assist
        </span>
      </div>

      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
        <Field label="Type" icon={HandCoins}>
          <select
            className="input"
            value={form.type}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </Field>

        <Field label="Category" icon={Tags}>
          <select
            className="input"
            value={form.category}
            disabled={isExpenseCategoryMissing}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            {isExpenseCategoryMissing ? (
              <option value="">Set a budget category first</option>
            ) : null}
            {categoryOptions.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Amount" icon={HandCoins}>
          <input
            className="input"
            type="number"
            placeholder="Enter amount"
            value={form.amount}
            onChange={(e) => onFieldChange("amount", e.target.value)}
            required
          />
        </Field>

        <Field label="Date" icon={CalendarDays}>
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(e) => onFieldChange("date", e.target.value)}
            required
          />
        </Field>

        <Field label="Merchant / Payee" icon={Store}>
          <input
            className="input"
            type="text"
            placeholder="Where did you pay?"
            value={form.merchant}
            onChange={(e) => onFieldChange("merchant", e.target.value)}
          />
        </Field>

        <Field label="Notes" icon={FileText}>
          <input
            className="input"
            type="text"
            placeholder="Optional notes"
            value={form.notes}
            onChange={(e) => onFieldChange("notes", e.target.value)}
          />
        </Field>

        {form.type === "expense" && aiCategorySuggestion ? (
          <div className={`sm:col-span-2 rounded-xl border px-3 py-2 ${theme.aiBox}`}>
            <p className={`text-sm ${theme.aiText}`}>
              AI suggestion:{" "}
              <span className="font-semibold">{aiCategorySuggestion.category}</span> (
              {aiCategorySuggestion.confidence} confidence)
            </p>
            <p className={`mt-1 text-xs ${theme.aiSubtext}`}>
              Based on {aiCategorySuggestion.reason}.
            </p>
            {form.category !== aiCategorySuggestion.category ? (
              <button
                type="button"
                className={`mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${theme.aiButton}`}
                onClick={onApplySuggestion}
              >
                Apply suggestion
              </button>
            ) : null}
          </div>
        ) : null}

        <button
          className="btn-primary sm:col-span-2 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isExpenseCategoryMissing || loading}
        >
          {loading ? "Adding..." : "Add Transaction"}
        </button>
      </form>
    </article>
  );
};

export default TransactionFormCard;

