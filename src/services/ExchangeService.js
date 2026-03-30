// src/services/ExchangeService.js
import api from "./api.js";

// 1. Dobijanje kursne liste (Realni API poziv)
export async function getExchangeRates() {
  // IZMENI OVO: skini "exchange/" i stavi crticu da odgovara handlers.go fajlu
  const response = await api.get("/exchange-rates"); 
  
  const ratesMap = {};
  if (response.data) {
    // Tvoj backend vraća niz objekata, mapiraj ih:
    response.data.forEach(r => {
      ratesMap[r.currencyCode] = r.middleRate;
    });
  }
  if (!ratesMap["RSD"]) ratesMap["RSD"] = 1.0;
  
  return ratesMap;
}

// 2. Izvršavanje konverzije (Realni API poziv)
export async function performExchange(from, to, amount) {
  // Backend: POST /api/exchange/convert
  const response = await api.post("/exchange/convert", {
    from_currency: from,
    to_currency: to,
    amount: parseFloat(amount)
  });
  
  return {
    originalAmount: amount,
    convertedAmount: response.data.converted_amount,
    exchangeRate: response.data.exchange_rate,
    fromCurrency: from,
    toCurrency: to
  };
}

// 3. Dobijanje liste berzi (OVO JE FALILO - trenutno MOCK jer nema na backendu)
export async function getExchanges() {
  // Pošto backend nema rutu /api/exchanges, vraćamo prazan niz ili test podatke
  // da BerzaPage.jsx ne bi bacao Error
  console.warn("getExchanges: Ruta ne postoji na backendu, vraćam test podatke.");
  return [
    { id: 1, naziv: "Belgrade Stock Exchange", valuta: "RSD", timezone: "Europe/Belgrade", isOpen: true },
    { id: 2, naziv: "New York Stock Exchange", valuta: "USD", timezone: "America/New_York", isOpen: false }
  ];
}

// 4. Promena statusa berze (OVO JE FALILO - trenutno MOCK)
export async function updateExchangeStatus(exchangeId, isOpen) {
  console.warn("updateExchangeStatus: Ruta ne postoji na backendu.");
  return { success: true };
}