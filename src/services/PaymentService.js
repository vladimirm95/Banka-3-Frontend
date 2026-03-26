import api from "./api.js";

export async function getRecipients() {
  const response = await api.get("/recipients");
  return response.data;
}

export async function getTransactions(filters = {}) {
  const response = await api.get("/transactions", { params: filters });
  return Array.isArray(response.data) ? response.data : [];
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
