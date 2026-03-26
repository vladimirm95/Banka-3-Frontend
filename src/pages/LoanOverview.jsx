import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import "./LoanOverview.css";

export default function LoanOverview() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const mockLoans = [
    { id: 1, amount: 10000, repaymentPeriod: 60, monthlyInstallment: 210, status: "APPROVED" },
    { id: 2, amount: 5000,  repaymentPeriod: 36, monthlyInstallment: 155, status: "PENDING" },
    { id: 3, amount: 8000,  repaymentPeriod: 48, monthlyInstallment: 190, status: "REJECTED" },
  ];

  useEffect(() => {
    setTimeout(() => {
      setLoans(mockLoans);
      setLoading(false);
    }, 400);
  }, []);

  if (loading) {
    return <div className="lov-loading">Učitavanje kredita...</div>;
  }

  return (
      <div className="lov-page">
            <Sidebar />

        <h1 className="lov-title">Moji krediti</h1>

        <div className="lov-grid">
          {loans.map((loan) => (
              <div key={loan.id} className="lov-card">

                <div className={`lov-status ${loan.status}`}>
                  {loan.status}
                </div>

                <div className="lov-amount">
                  {loan.amount.toLocaleString()} €
                </div>

                <div className="lov-info">
                  <div>
                    <span>Rok otplate</span>
                    <strong>{loan.repaymentPeriod} meseci</strong>
                  </div>
                  <div>
                    <span>Mesečna rata</span>
                    <strong>{loan.monthlyInstallment} €</strong>
                  </div>
                </div>

              </div>
          ))}
        </div>
      </div>
  );
}