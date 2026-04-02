import api from "./api.js";

export async function getAccounts() {
  const response = await api.get("/accounts");
  return response.data;
}

export async function getAccountTransactions(accountNumber) {
  try {
    const response = await api.get("/transactions", {
      params: { account_number: accountNumber },
    });
    return response.data || [];
  } catch {
    return [];
  }
}

export async function getAccountByNumber(accountNumber) {
  const response = await api.get(`/accounts/${accountNumber}`);
  return response.data;
}

export async function createAccount(data) {
  const response = await api.post("/accounts", data);
  return response.data;
}

export async function renameAccount(accountNumber, accountName) {
  const response = await api.patch(`/accounts/${accountNumber}/name`, {
    name: accountName,
  });
  return response.data;
}

export async function updateAccountLimits(accountNumber, dailyLimit, monthlyLimit) {
  const response = await api.patch(`/accounts/${accountNumber}/limit`, {
    daily_limit: dailyLimit,
    monthly_limit: monthlyLimit,
  });
  return response.data;
}