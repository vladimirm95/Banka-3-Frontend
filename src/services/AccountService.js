import api from "./api.js";


export async function getAccounts() {
  
    // Ovo ostavljamo da bismo znali kad proradi backend
    const response = await api.get("/accounts");
    return response.data;
}


export async function getAccountTransactions(accountNumber) {
  try {
    // Pošto si sad Petar, moraš poslati broj računa da bi backend znao 
    // koje transakcije da filtrira, inače će ti vratiti 403 ili 404
    const response = await api.get("/transactions", { 
      params: { account_number: accountNumber } 
    });
    return response.data || [];
  } catch (error) {
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