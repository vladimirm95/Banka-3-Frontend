// src/services/ExchangeService.js
import api from "./api.js";

export async function getExchangeRates() {
  const response = await api.get("/exchange-rates");
  return response.data || [];
}

// 2. Izvršavanje konverzije putem internog transfera
export async function performExchange(fromAccount, toAccount, amount, description = "") {
  const response = await api.post("/transactions/transfer", {
    from_account: fromAccount,
    to_account: toAccount,
    amount: parseFloat(amount),
    description,
  });

  return response.data;
}

// 4. Promena statusa berze (OVO JE FALILO - trenutno MOCK)
export async function updateExchangeStatus() {
  console.warn("updateExchangeStatus: Ruta ne postoji na backendu.");
  return { success: true };
}