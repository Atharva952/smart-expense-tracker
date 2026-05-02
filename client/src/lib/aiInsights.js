const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "to",
  "at",
  "by",
  "of",
  "in",
  "on",
  "is",
  "was",
  "are",
  "a",
  "an",
  "my",
  "your",
  "our",
  "upi",
  "card",
  "bank",
  "payment",
  "paid",
  "pay",
  "transfer",
  "debit",
  "credit",
]);

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text = "") =>
  normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const sameMonth = (date, referenceDate) => {
  const parsed = new Date(date);
  return (
    parsed.getFullYear() === referenceDate.getFullYear() &&
    parsed.getMonth() === referenceDate.getMonth()
  );
};

const getTopCategory = (transactions) => {
  const categorySpend = transactions.reduce((acc, tx) => {
    const key = tx.category?.trim();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + Number(tx.amount || 0);
    return acc;
  }, {});

  const top = Object.entries(categorySpend).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  return { category: top[0], amount: top[1] };
};

export const getCategorySuggestion = ({
  transactions = [],
  type,
  merchant,
  notes,
  categoryOptions = [],
}) => {
  if (type === "income") {
    return { category: "Income", confidence: "high", reason: "income entry" };
  }

  if (!categoryOptions.length) return null;

  const merchantKey = normalizeText(merchant);
  const textTokens = new Set(tokenize(`${merchant || ""} ${notes || ""}`));
  if (!merchantKey && !textTokens.size) return null;

  const allowed = new Set(categoryOptions);
  const scores = new Map();
  const merchantHits = new Map();
  const tokenHits = new Map();

  transactions.forEach((tx) => {
    if (tx.type !== "expense") return;
    const category = tx.category?.trim();
    if (!category || !allowed.has(category)) return;

    const historicalMerchant = normalizeText(tx.merchant || "");
    if (merchantKey && historicalMerchant && historicalMerchant === merchantKey) {
      const next = (merchantHits.get(category) || 0) + 1;
      merchantHits.set(category, next);
      scores.set(category, (scores.get(category) || 0) + 4);
    }

    const historicalTokens = new Set(tokenize(`${tx.merchant || ""} ${tx.notes || ""}`));
    historicalTokens.forEach((token) => {
      if (!textTokens.has(token)) return;
      tokenHits.set(category, (tokenHits.get(category) || 0) + 1);
      scores.set(category, (scores.get(category) || 0) + 1);
    });
  });

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const best = ranked[0];
  if (!best || best[1] <= 0) return null;

  const secondScore = ranked[1]?.[1] || 0;
  const [category, score] = best;
  const confidence =
    score >= 7 && score - secondScore >= 3
      ? "high"
      : score >= 4
        ? "medium"
        : "low";

  const merchantCount = merchantHits.get(category) || 0;
  const tokenCount = tokenHits.get(category) || 0;
  const reasonParts = [];
  if (merchantCount > 0) {
    reasonParts.push(`merchant matched ${merchantCount} past transaction(s)`);
  }
  if (tokenCount > 0) {
    reasonParts.push(`shared ${tokenCount} keyword match(es)`);
  }

  return {
    category,
    confidence,
    reason: reasonParts.join(" and ") || "historical spending pattern",
  };
};

export const buildMonthlySummary = ({ dashboard, transactions = [] }) => {
  if (!dashboard?.cards) return null;

  const income = Number(dashboard.cards.income || 0);
  const expenses = Number(dashboard.cards.expenses || 0);
  const balance = Number(dashboard.cards.totalBalance || 0);
  const expenseDelta = Number(dashboard.cards?.deltas?.expense || 0);
  const incomeDelta = Number(dashboard.cards?.deltas?.income || 0);

  const now = new Date();
  const monthLabel = now.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const currentMonthExpenses = transactions.filter(
    (tx) => tx.type === "expense" && sameMonth(tx.date, now),
  );
  const topCategory = getTopCategory(currentMonthExpenses);

  const headline =
    income === 0 && expenses === 0
      ? `No transactions were logged in ${monthLabel} yet.`
      : balance >= 0
        ? `You stayed cash-positive in ${monthLabel}, finishing at ${formatMoney(balance)}.`
        : `Expenses are currently ahead of income in ${monthLabel} by ${formatMoney(
            Math.abs(balance),
          )}.`;

  const details = [
    `Income is ${formatMoney(income)} and expenses are ${formatMoney(expenses)} this month.`,
    `Vs last month: income ${incomeDelta >= 0 ? "up" : "down"} ${Math.abs(
      incomeDelta,
    )}% and expenses ${expenseDelta >= 0 ? "up" : "down"} ${Math.abs(expenseDelta)}%.`,
  ];

  if (topCategory) {
    details.push(
      `Top expense category is ${topCategory.category} at ${formatMoney(topCategory.amount)}.`,
    );
  }

  return {
    title: "AI Monthly Summary",
    headline,
    details,
  };
};

