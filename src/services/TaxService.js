import api from "./api";

export async function getTaxData() {
  const response = await api.get("/tax/debts");
  return (response.data || []).map((d) => ({
    id: d.user_id,
    firstName: d.first_name,
    lastName: d.last_name,
    role: d.team,
    taxAmount: d.unpaid_rsd,
  }));
}

export async function triggerTaxCollection() {
  const response = await api.post("/tax/run");
  return response.data;
}
