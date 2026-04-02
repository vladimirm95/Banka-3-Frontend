import api from "./api.js";

export async function getUserCards() {
  const response = await api.get("/cards");

  return (response.data || []).map(card => ({
    id: card.card_number,
    cardNumber: card.card_number,
    cardType: card.card_type,
    cardName: card.card_name,
    status: card.status === "active" ? "Aktivna" : "Blokirana",
    expiryDate: card.expiration_date,
    cvv: card.cvv,
    accountNumber: card.account_number,
    limit: card.limit || 0,
  }));
}

export async function getUserAccounts() {
  const response = await api.get("/accounts");

  return (response.data || []).map(acc => ({
    id: acc.account_number,
    accountNumber: acc.account_number,
    accountName: acc.account_name,
    currency: acc.currency,
    balance: acc.balance,
    type: acc.account_type,
    cardCount: 0,
  }));
}

export async function requestCard(cardData) {
  const response = await api.post("/cards", {
    account_number: cardData.accountNumber,
    card_type: "debit",
    card_brand: "visa"
  });

  return response.data;
}

export async function blockCard(cardNumber) {
  return api.patch(`/cards/${cardNumber}/block`);}

export function formatCardNumber(num) {
  if (!num) return "** ** ** **";
  return num.replace(/\d{4}(?=.)/g, "$& ");
}