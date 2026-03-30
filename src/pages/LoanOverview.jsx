import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { getLoans } from "../services/LoanService.js";
import "./LoanOverview.css";

// Helper funkcija za formatiranje novca
function formatMoney(amount, currency = "RSD") {
  if (amount == null) return "0.00 " + currency;
  return (
    new Intl.NumberFormat("sr-RS", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " " + currency
  );
}

export default function LoanOverview() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadLoans = async () => {
      try {
        setLoading(true);
        const data = await getLoans();
        if (!cancelled) {
          // Osiguravamo da je data niz
          setLoans(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError("Greška pri učitavanju kredita.");
          console.error("Error loading loans:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    loadLoans();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="lov-page">
        <Sidebar />
        <div className="lov-loading">Učitavanje kredita...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lov-page">
        <Sidebar />
        <div className="lov-loading" style={{ color: "#f87171" }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="lov-page">
      <Sidebar />

      <h1 className="lov-title">Moji krediti</h1>

      <div className="lov-grid">
        {loans && loans.length > 0 ? (
          loans.map((loan) => (
            /* Na bekenu je polje loan_number (String) */
            <div key={loan.loan_number} className="lov-card">

              {/* Status pretvaramo u velika slova zbog tvojih CSS klasa .APPROVED, .PENDING... */}
              <div className={`lov-status ${(loan.status || "").toUpperCase()}`}>
                {loan.status}
              </div>

              <div className="lov-amount">
                {/* Polje na bekenu je loan_amount */}
                {formatMoney(loan.loan_amount, loan.currency)}
              </div>

              <div className="lov-info">
                <div>
                  <span>Rok otplate</span>
                  {/* Polje na bekenu je repayment_period */}
                  <strong>{loan.repayment_period} meseci</strong>
                </div>
                <div>
                  <span>Mesečna rata</span>
                  {/* Polje na bekenu je next_installment_amount */}
                  <strong>{formatMoney(loan.next_installment_amount, loan.currency)}</strong>
                </div>
              </div>
              
              <div className="lov-info" style={{marginTop: '10px', borderTop: '1px solid #1e293b', paddingTop: '10px'}}>
                <div>
                  <span>Preostali dug</span>
                  {/* Polje na bekenu je remaining_debt */}
                  <strong>{formatMoney(loan.remaining_debt, loan.currency)}</strong>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="lov-empty">
            <p>Trenutno nemate aktivnih kredita.</p>
          </div>
        )}
      </div>
    </div>
  );
}