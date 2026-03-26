import api from "./api.js";

/**
 * KLIJENT: Dohvatanje sopstvenih kredita
 */
export async function getLoans(params = {}) {
  try {
    const response = await api.get("/loans", { params });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Loans API error:", error.message);
    return [];
  }
}

/**
 * KLIJENT: Podnošenje zahteva za kredit
 */
export async function createLoanRequest(data) {
  const payload = {
    account_number: data.account_number,
    loan_type: (data.loan_type || "GOTOVINSKI").toUpperCase(),
    amount: parseInt(data.amount),
    repayment_period: parseInt(data.period),
    currency: data.currency || "RSD",
    purpose: data.purpose || "",
    salary: parseInt(data.salary) || 0,
    employment_status: data.employment_status || "full_time",
    employment_period: parseInt(data.employment_period) || 0,
    phone_number: data.phone_number || "",
    interest_rate_type: data.interest_rate_type || "fixed",
  };

  const response = await api.post("/loan-requests", payload);
  return response.data;
}

/**
 * ADMIN: Dohvatanje svih zahteva za kredite
 */
export async function getLoanRequests(params = {}) {
  try {
    const response = await api.get("/loan-requests", { params });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Error fetching loan requests:", error);
    return [];
  }
}

/**
 * ADMIN: Odobravanje kredita
 */
export async function approveLoanRequest(requestId) {
  const response = await api.patch(`/loan-requests/${requestId}/approve`);
  return response.data;
}

/**
 * ADMIN: Odbijanje kredita
 */
export async function rejectLoanRequest(requestId) {
  const response = await api.patch(`/loan-requests/${requestId}/reject`);
  return response.data;
}

/**
 * Dohvatanje jednog kredita po broju
 */
export async function getLoanByNumber(loanNumber) {
  try {
    const response = await api.get(`/loans/${loanNumber}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching loan:", error.message);
    return null;
  }
}
