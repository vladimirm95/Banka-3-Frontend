import api from "./api.js";

// Backend za investicione fondove (issues #214/#215) još nije implementiran u
// Banka-3-Backend. Mock layer ispod definiše budući REST contract — kad
// backend stigne, postavi VITE_USE_FUNDS_MOCK=false u .env.
const USE_MOCK =
  (import.meta.env?.VITE_USE_FUNDS_MOCK ?? "true") === "true";

const seedFunds = [
  {
    id: "fund-1",
    name: "Banka 3 Equity Growth",
    manager: "Marko Marković",
    value_minor: 4_582_300,
    nav_minor: 36_658_400,
    currency: "RSD",
  },
  {
    id: "fund-2",
    name: "Banka 3 Balanced",
    manager: "Ivana Petrović",
    value_minor: 1_205_000,
    nav_minor: 37_656_250,
    currency: "RSD",
  },
  {
    id: "fund-3",
    name: "Banka 3 USD Money Market",
    manager: "Stefan Jović",
    value_minor: 92_400,
    nav_minor: 11_550_000,
    currency: "USD",
  },
];

function withSharePct(f) {
  const nav = Math.max(1, f.nav_minor);
  return { ...f, share_pct: (f.value_minor / nav) * 100 };
}

let mockState = seedFunds.map((f) => ({ ...f }));

function applyDelta(fundId, deltaMinor) {
  const fund = mockState.find((f) => f.id === fundId);
  if (!fund) {
    const err = new Error("Fond nije pronađen.");
    err.code = "NOT_FOUND";
    throw err;
  }
  const newValue = fund.value_minor + deltaMinor;
  if (newValue < 0) {
    const err = new Error("Nedovoljno sredstava u fondu za povlačenje.");
    err.code = "INSUFFICIENT_FUNDS";
    throw err;
  }
  fund.value_minor = newValue;
  fund.nav_minor = Math.max(1, fund.nav_minor + deltaMinor);
  return withSharePct(fund);
}

function parseAmountMinor(amountMajor) {
  const minor = Math.round(Number(amountMajor) * 100);
  if (!Number.isFinite(minor) || minor <= 0) {
    const err = new Error("Iznos mora biti pozitivan broj.");
    err.code = "INVALID_AMOUNT";
    throw err;
  }
  return minor;
}

export async function listMyFunds() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 120));
    return mockState.map(withSharePct);
  }
  const { data } = await api.get("/portfolio/funds");
  return Array.isArray(data) ? data : [];
}

export async function depositToFund(fundId, amountMajor, accountNumber) {
  if (USE_MOCK) {
    const minor = parseAmountMinor(amountMajor);
    await new Promise((r) => setTimeout(r, 180));
    return applyDelta(fundId, minor);
  }
  const minor = parseAmountMinor(amountMajor);
  const { data } = await api.post(`/portfolio/funds/${fundId}/deposit`, {
    amount_minor: minor,
    account_number: accountNumber,
  });
  return data;
}

export async function withdrawFromFund(fundId, amountMajor, accountNumber) {
  if (USE_MOCK) {
    const minor = parseAmountMinor(amountMajor);
    await new Promise((r) => setTimeout(r, 180));
    return applyDelta(fundId, -minor);
  }
  const minor = parseAmountMinor(amountMajor);
  const { data } = await api.post(`/portfolio/funds/${fundId}/withdraw`, {
    amount_minor: minor,
    account_number: accountNumber,
  });
  return data;
}

export const __testing = USE_MOCK
  ? {
      reset() {
        mockState = seedFunds.map((f) => ({ ...f }));
      },
    }
  : undefined;
