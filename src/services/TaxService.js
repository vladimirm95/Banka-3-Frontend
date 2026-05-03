import api from "./api";

// Backend stores RSD as int64 minor units (cents/para). Frontend renders
// in major units, so divide by 100 at the boundary.
const CENTS = 100;

function mapDebtor(d) {
  return {
    id: d.user_id,
    firstName: d.first_name || "",
    lastName: d.last_name || "",
    team: d.team || "",
    role: d.team || "",
    unpaidRsd: (d.unpaid_rsd ?? 0) / CENTS,
    paidRsd: (d.paid_rsd ?? 0) / CENTS,
  };
}

export async function getTaxDebts({ team, name } = {}) {
  const params = {};
  if (team) params.team = team;
  if (name) params.name = name;
  const { data } = await api.get("/tax/debts", { params });
  const list = Array.isArray(data) ? data : [];
  return list.map(mapDebtor);
}

export async function runTaxCollection({ month } = {}) {
  const params = {};
  if (month) params.month = month;
  const { data } = await api.post("/tax/run", null, { params });
  return {
    period: data?.period || "",
    accountsPaid: data?.accounts_paid ?? 0,
    rowsPaid: data?.rows_paid ?? 0,
    insufficient: data?.insufficient ?? 0,
    totalDebtRsd: (data?.total_debt_rsd ?? 0) / CENTS,
    collectedRsd: (data?.collected_rsd ?? 0) / CENTS,
  };
}
