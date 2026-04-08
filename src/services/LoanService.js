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
    account_number: data.account_number || "",
    loan_type: data.loan_type || "GOTOVINSKI",
    amount: data.amount || 0,
    repayment_period: data.repayment_period || 0,
    currency: data.currency || "RSD",
    purpose: data.purpose || "",
    salary: data.salary || 0,
    employment_status: data.employment_status || "ZAPOSLEN",
    employment_period: parseInt(data.employment_period) || 0,
    phone_number: data.phone_number || "",
    interest_rate_type: data.interest_rate_type || "FIKSNA",
  };

  console.log("📤 PAYLOAD:", JSON.stringify(payload, null, 2));

  try {
    const response = await api.post("/loan-requests", payload);
    return response.data;
  } catch (err) {
    // ✅ DETALJNI ERROR LOG
    console.error("❌ ERROR OD BACKENDA:");
    console.error("Status:", err.response?.status);
    console.error("Message:", err.response?.statusText);
    console.error("Data:", JSON.stringify(err.response?.data, null, 2));
    console.error("Full Error:", err);
    throw err;
  }
}

/**
 * ADMIN: Dohvatanje svih zahteva za kredite
 */
export async function getLoanRequests() {
  try {
    const response = await api.get("/loan-requests");
    console.log("📋 Loan requests response:", response.data);
    if (response.data && response.data.length > 0) {
      console.log("📋 Prvi zahtev:", response.data[0]);
    }
    return response.data;
  } catch (err) {
    console.error("Error loading loans:", err);
    throw err;
  }
}

/**
 * ADMIN: Odobravanje kredita
 */
export async function approveLoanRequest(requestId) {
  const token = sessionStorage.getItem("accessToken");
  const role = sessionStorage.getItem("userRole");
  
  console.log("🔍 Approve Request Debug:");
  console.log("  Token:", token?.substring(0, 20) + "...");
  console.log("  Role:", role);
  console.log("  Request ID:", requestId);
  
  try {
    const response = await api.patch(`/loan-requests/${requestId}/approve`);
    console.log("Approve success:", response.data);
    return response.data;
  } catch (err) {
    console.log("Full error object:", err);
    console.log("  Status:", err.response?.status);
    console.log("  Status Text:", err.response?.statusText);
    console.log("  Headers:", err.response?.headers);
    console.log("  Data:", err.response?.data);
    console.log("  Config URL:", err.config?.url);
    console.log("  Config Method:", err.config?.method);
    console.log("  Config Headers:", err.config?.headers);
    throw err;
  }
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
