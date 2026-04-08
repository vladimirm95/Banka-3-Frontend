import api from "./api.js";

export async function getRecipients() {
  const response = await api.get("/recipients");
  return response.data;
}

export async function getTransactions(filters = {}) {
  const params = {};

  if (filters.status) {
    const statusMap = {
      Realizovano: "realized",
      "Na čekanju": "pending",
      Odbijeno: "rejected",
      Odobreno: "approved",
    };
    params.status = statusMap[filters.status] || filters.status;
  }

  if (filters.dateFrom) params.date = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;

  if (filters.amountMin || filters.amountMax) {
    const min = filters.amountMin || 0;
    const max = filters.amountMax || 999999999;
    params.amount = `${min}-${max}`;
  }

  try {
    const response = await api.get("/transactions", { params });

    const data = Array.isArray(response.data) ? response.data : [];

    const statusReverseMap = {
      realized: "Realizovano",
      completed: "Realizovano",
      pending: "Na čekanju",
      rejected: "Odbijeno",
      approved: "Odobreno",
    };

    const processedData = data.map((tx) => ({
      ...tx,
      status: statusReverseMap[tx.status] || tx.status || "Realizovano",
      currency: tx.currency || "RSD",
    }));

    return processedData;
  } catch (error) {
    console.error("❌ API ERROR:", error);
    throw error;
  }
}

export async function createRecipient(recipientData) {
  const response = await api.post("/recipients", recipientData);
  return response.data;
}

export async function updateRecipient(id, recipientData) {
  const response = await api.put(`/recipients/${id}`, recipientData);
  return response.data;
}

export async function deleteRecipient(id) {
  const response = await api.delete(`/recipients/${id}`);
  return response.data;
}

export async function createPayment(paymentData, totpCode) {
  const config = totpCode ? { headers: { TOTP: totpCode } } : {};
  const response = await api.post("/transactions/payment", paymentData, config);
  return response.data;
}

export async function createTransfer(transferData, totpCode) {
  const config = totpCode ? { headers: { TOTP: totpCode } } : {};
  const response = await api.post("/transactions/transfer", transferData, config);
  return response.data;
}

export function mapPaymentError(error) {
  if (!error?.response) {
    return "Plaćanje trenutno nije moguće zbog problema sa mrežom. Pokušajte ponovo.";
  }

  const status = error.response?.status;
  const raw =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.data?.details ||
      error.response?.data ||
      "";

  const message = String(raw).toLowerCase().trim();

  if (message.includes("insufficient") || message.includes("fund")) {
    return "Nemate dovoljno sredstava na izabranom računu za ovo plaćanje.";
  }

  if (message.includes("inactive")) {
    return "Račun primaoca nije aktivan i uplata trenutno nije moguća.";
  }

  if (message.includes("daily limit") || message.includes("limit exceeded")) {
    return "Prekoračili ste dnevni limit za plaćanja sa ovog računa.";
  }

  if (message.includes("account not found")) {
    return "Uneti račun nije pronađen. Proverite broj računa i pokušajte ponovo.";
  }

  if (
      message.includes("exchange service unavailable") ||
      message.includes("service unavailable") ||
      status === 503
  ) {
    return "Plaćanje trenutno nije moguće zbog privremenog problema sa sistemom. Pokušajte ponovo kasnije.";
  }

  if (message.includes("totp") || message.includes("kod")) {
    return "Uneti TOTP kod nije ispravan. Pokušajte ponovo.";
  }

  return "Došlo je do greške pri obradi plaćanja. Proverite unete podatke i pokušajte ponovo.";
}