import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./BusinessDetailsPage.css";
import Sidebar from "../components/Sidebar.jsx";
import { getAccountDetails } from "../services/BusinessService";

const BusinessAccountDetailsPage = () => {
  const { id } = useParams();

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

 useEffect(() => {
    const fetchAccount = async () => {
      try {
        const data = await getAccountDetails(id);
        setAccount(data);
      } catch {
        setError("Greška pri učitavanju podataka o računu.");
      } finally {
        setLoading(false);
      }
    };
    fetchAccount();
  }, [id]);

  const formatMoney = (amount) =>
      new Intl.NumberFormat("sr-RS").format(amount);

  const formatDate = (date) =>
      new Date(date).toLocaleDateString("sr-RS");

  if (loading) return <div className="business-loading">Učitavanje...</div>;
  if (error)   return <div className="business-loading">{error}</div>;

  return (

    <div className="business-container">
      <Sidebar/>
      <div className="header">
        <div>
          <p className="welcome">Dobrodošli,</p>
          <h1>{account.ownerName}</h1>

          <div className="bell">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>

        </div>

        <div className="balance-card">
          <p>Ukupno stanje</p>
          <h2>{formatMoney(account.balance)} RSD</h2>
          <div className="actions">
            <button>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
              <span>Uplata</span>
            </button>
            <button>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              <span>Plaćanje</span>
            </button>
            <button>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              <span>Prenos</span>
            </button>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <h3>Firma</h3>
            <p><strong>{account.companyName}</strong></p>
            <p>PIB: {account.pib}</p>
            <p>{account.address}</p>
          </div>

          <div className="card">
            <h3>Vlasnik</h3>
            <p>{account.ownerName}</p>
            <p>{account.ownerEmail}</p>
          </div>
        </div>

        <div className="card transactions">
          <h3>Poslednje transakcije</h3>
          {account.transactions?.map((t, i) => (
              <div key={t.id || i} className="transaction">
                <div>
                  <p className="desc">{t.description}</p>
                  <span>{formatDate(t.date)}</span>
                </div>
                <div className={t.amount < 0 ? "negative" : "positive"}>
                  {formatMoney(t.amount)} RSD
                </div>
              </div>
          ))}
        </div>
      </div>
       </div>
  );
};

export default BusinessAccountDetailsPage;
