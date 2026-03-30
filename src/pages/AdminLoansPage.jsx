import { useState, useEffect } from "react"
import Sidebar from "../components/Sidebar.jsx";
import { getLoanRequests, approveLoanRequest, rejectLoanRequest } from "../services/LoanService.js";
import "./AdminLoansPage.css"

export default function AdminLoansPage(){

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadLoans = async () => {
      try {
        const data = await getLoanRequests();
        if (!cancelled) {
          setLoans(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError("Greška pri učitavanju zahteva.");
          console.error("Error loading loan requests:", err);
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

  const filteredLoans = loans.filter(l => {
    if (filter === "ALL") return true;
    return l.status === filter;
  });

  const updateStatus = async (id, newStatus) => {
    setUpdating(true);
    try {
      if (newStatus === "APPROVED") {
        await approveLoanRequest(id);
      } else if (newStatus === "REJECTED") {
        await rejectLoanRequest(id);
      }
      
      // Update local state
      const updatedLoans = loans.map(l =>
        l.id === id ? { ...l, status: newStatus } : l
      );
      setLoans(updatedLoans);
      setSelected(null);
      setError("");
    } catch (err) {
      setError("Greška pri ažuriranju zahteva.");
      console.error("Error updating loan:", err);
    } finally {
      setUpdating(false);
    }
  };

  return(
    <div className="loan-page">
      <Sidebar/>

      <h1 className="loan-title">
        Administracija kreditnih zahteva
      </h1>

      {error && <div style={{ color: "red", padding: "10px" }}>{error}</div>}
      {loading && <div style={{ padding: "10px" }}>Učitavanje zahteva...</div>}

      {!loading && (
        <>
          <div className="loan-filter">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL">Svi zahtevi</option>
              <option value="PENDING">Na čekanju</option>
              <option value="APPROVED">Odobreni</option>
              <option value="REJECTED">Odbijeni</option>
            </select>
          </div>

          <div className="loan-grid">
            {filteredLoans.length > 0 ? (
              filteredLoans.map(loan => (
                <div
                  key={loan.id}
                  className="loan-card"
                  onClick={() => setSelected(loan)}
                  style={{ cursor: "pointer" }}
                >
                  <div className={`loan-status ${loan.status}`}>
                    {loan.status}
                  </div>

                  <div className="loan-amount">
                    {loan.amount} €
                  </div>

                  <div className="loan-info">
                    <div>
                      <span>Klijent</span>
                      <strong>{loan.client}</strong>
                    </div>

                    <div>
                      <span>Period</span>
                      <strong>{loan.period} meseci</strong>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p>Nema dostupnih zahteva.</p>
            )}
          </div>

          {selected && (
            <div className="loan-details">
              <h2>Detalji zahteva</h2>

              <p><strong>Klijent:</strong> {selected.client}</p>
              <p><strong>Iznos:</strong> {selected.amount} €</p>
              <p><strong>Period:</strong> {selected.period} meseci</p>
              <p><strong>Status:</strong> {selected.status}</p>

              {selected.status === "PENDING" && (
                <div className="loan-actions">
                  <button
                    className="loan-approve"
                    onClick={() => updateStatus(selected.id, "APPROVED")}
                    disabled={updating}
                  >
                    {updating ? "Obrada..." : "Odobri"}
                  </button>

                  <button
                    className="loan-reject"
                    onClick={() => updateStatus(selected.id, "REJECTED")}
                    disabled={updating}
                  >
                    {updating ? "Obrada..." : "Odbij"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}