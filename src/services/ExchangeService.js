// src/services/ExchangeService.js
import api from "./api.js";

// Currency exchange rates against RSD (used by the menjačnica/conversion page).
export async function getExchangeRates() {
  const response = await api.get("/exchange-rates");
  return response.data || [];
}

// Stock exchanges (NYSE, NASDAQ, ...) — used by Berza portal and order forms.
export async function getExchanges() {
  const response = await api.get("/exchanges");
  return response.data || [];
}

export async function setExchangeOpenOverride(id, openOverride) {
  const response = await api.patch(`/exchanges/${id}/open-override`, {
    open_override: openOverride,
  });
  return response.data;
}
