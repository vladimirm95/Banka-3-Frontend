// src/services/ExchangeService.js
import api from "./api.js";

export async function getExchangeRates() {
  const response = await api.get("/exchange-rates");

  const ratesMap = {};
  if (response.data) {
    response.data.forEach((r) => {
      ratesMap[r.currencyCode] = r.middleRate;
    });
  }

  return ratesMap;
}

// 2. Izvršavanje konverzije (Realni API poziv)
export async function performExchange(from, to, amount) {
  // Backend: POST /api/exchange/convert
  const response = await api.post("/exchange/convert", {
    from_currency: from,
    to_currency: to,
    amount: parseFloat(amount),
  });

  return {
    originalAmount: amount,
    convertedAmount: response.data.converted_amount,
    exchangeRate: response.data.exchange_rate,
    fromCurrency: from,
    toCurrency: to,
  };
}

// 4. Promena statusa berze (OVO JE FALILO - trenutno MOCK)
export async function updateExchangeStatus(exchangeId, isOpen) {
  console.warn("updateExchangeStatus: Ruta ne postoji na backendu.");
  return { success: true };
}
