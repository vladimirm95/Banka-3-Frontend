import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getRecipients } from "../services/PaymentService";
import Sidebar from "../components/Sidebar.jsx";
import "./RecipientsPage.css";

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
  async function load() {
    setLoading(true);
    try {
      const data = await getRecipients();
      
      // Proveravamo da li je data niz ili objekat koji sadrži 'content' niz
      if (Array.isArray(data)) {
        setRecipients(data);
      } else if (data && Array.isArray(data.content)) {
        // OVO JE NAJVEROVATNIJI SCENARIO za ovaj API
        setRecipients(data.content);
      } else {
        setRecipients([]); // Fallback na prazan niz
      }
    } catch (error) {
      console.error("Greška:", error);
      setRecipients([]);
    }
    setLoading(false);
  }
  load();
  }, []);

  const filtered = useMemo(() => {
  // Ako iz nekog razloga recipients nije niz, vrati prazan niz odmah
  if (!Array.isArray(recipients)) return [];

  const lower = searchTerm.toLowerCase();
  return recipients.filter((r) => {
    // Dodajemo i upitnik (optional chaining) da ne pukne ako r.name ne postoji
    const nameMatch = r.name?.toLowerCase().includes(lower);
    const accountMatch = r.account_number?.toLowerCase().includes(lower);
    return nameMatch || accountMatch;
  });
}, [recipients, searchTerm]);

  return (
      <div className="rp-bg">
        <Sidebar />

        <div className="rp-wrapper">
          <div className="rp-page-header">
            <h2 className="rp-page-title">Primaoci</h2>
            <div className="rp-header-actions">
              <button className="rp-secondary-btn" onClick={() => navigate("/payments")}>
                Istorija plaćanja →
              </button>
              <button className="rp-new-btn" onClick={() => navigate("/payments/new")}>
                + Novo plaćanje
              </button>
            </div>
          </div>

          <div className="rp-card">
            <div className="rp-card-header">
              <div className="rp-search-wrapper">
              <span className="rp-search-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
                <input
                    className="rp-search"
                    placeholder="Pretraga po imenu ili broju računa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button className="rp-clear-btn" onClick={() => setSearchTerm("")}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                )}
              </div>
              <span className="rp-result-count">
              {filtered.length} / {recipients.length} primaoca
            </span>
            </div>

            {loading ? (
                <div className="rp-loading">Učitavanje...</div>
            ) : filtered.length === 0 ? (
                <div className="rp-empty">Nema pronađenih primaoca.</div>
            ) : (
                <table className="rp-table">
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>Ime i prezime</th>
                    <th>Broj računa</th>
                  </tr>
                  </thead>
                  <tbody>
                  {filtered.map((r, i) => (
                      <tr key={r.id} className="rp-row">
                        <td className="rp-td-index">{i + 1}</td>
                        <td className="rp-td-name">
                          <div className="rp-avatar">{r.name.charAt(0)}</div>
                          {r.name}
                        </td>
                        <td className="rp-td-account">{r.account_number}</td>
                      </tr>
                  ))}
                  </tbody>
                </table>
            )}
          </div>
        </div>
      </div>
  );
}