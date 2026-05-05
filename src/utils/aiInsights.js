import { GoogleGenerativeAI } from "@google/generative-ai";

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

const normalizeText = (text = "") =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text = "") =>
  normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const normalizeConfidence = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
};

const coerceCategoryFromAllowed = (value, allowed) => {
  if (!value || !allowed?.length) return null;
  const direct = allowed.find(
    (item) => String(item).trim().toLowerCase() === String(value).trim().toLowerCase(),
  );
  return direct || null;
};

const getDefaultExpenseCategories = () => [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Other",
];

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.AI_API ||
  process.env.GOOGLE_API_KEY ||
  "";

let model = null;
if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  });
}

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

export const getCategorySuggestionAI = async ({
  merchant,
  notes,
  amount,
  categoryOptions = [],
}) => {
  if (!model) return null;

  const categories = categoryOptions.length
    ? categoryOptions
    : getDefaultExpenseCategories();

  const prompt = `
Classify this transaction into exactly one category from this list:
${categories.join(", ")}

Merchant: ${merchant || ""}
Notes: ${notes || ""}
Amount: INR ${Number(amount || 0)}

Return valid JSON only:
{"category": "", "confidence": ""}
`;

  try {
    const result = await model.generateContent(prompt);
    let text = result?.response?.text?.() || "";
    text = text.replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(text);
    const aiCategory = coerceCategoryFromAllowed(parsed?.category, categories);

    if (!aiCategory) return null;

    return {
      category: aiCategory,
      confidence: normalizeConfidence(parsed?.confidence),
      reason: "ai model prediction",
    };
  } catch (err) {
    return null;
  }
};

export const getSmartCategory = async (data) => {
  const ruleBased = getCategorySuggestion(data);

  if (ruleBased && ruleBased.confidence === "high") {
    return ruleBased;
  }

  const aiResult = await getCategorySuggestionAI(data);
  return aiResult || ruleBased;
};

export const generateMonthlySummaryAI = async ({
  income,
  expenses,
  balance,
  transactions = [],
}) => {
  if (!model) return null;

  const topTransactions = transactions
    .slice(0, 5)
    .map((tx) => `${tx.category || "Other"} INR ${Number(tx.amount || 0)}`)
    .join("\n");

  const prompt = `
You are a financial advisor.

Income: INR ${Number(income || 0)}
Expenses: INR ${Number(expenses || 0)}
Balance: INR ${Number(balance || 0)}

Top transactions:
${topTransactions || "No recent transactions"}

Give:
1. Summary
2. Insight
3. Suggestion

Keep it concise and practical.
`;

  try {
    const result = await model.generateContent(prompt);
    return result?.response?.text?.()?.trim() || null;
  } catch (err) {
    return null;
  }
};
