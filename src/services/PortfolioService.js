import api from "./api";

export async function listPortfolio() {
  const { data } = await api.get("/portfolio");
  return data;
}

export async function getMyTaxInfo() {
  const { data } = await api.get("/tax/me");
  return data;
}

export async function setHoldingPublic(holdingId, publicAmount) {
  const { data } = await api.patch(`/portfolio/${holdingId}/public`, {
    public_amount: publicAmount,
  });
  return data;
}

export async function sellHolding(payload) {
  const { data } = await api.post("/portfolio/sell", payload);
  return data;
}

export async function exerciseOption(optionId, accountNumber) {
  const { data } = await api.post(`/options/${optionId}/exercise`, {
    account_number: accountNumber,
  });
  return data;
}
