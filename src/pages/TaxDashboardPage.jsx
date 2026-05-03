import { useEffect, useState, useMemo } from "react";
import { getTaxData, triggerTaxCollection } from "../services/TaxService";
import Sidebar from "../components/Sidebar.jsx";
import "./TaxDashboardPage.css";

function TaxDashboardPage() {
  const [taxData, setTaxData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTaxData() {
      try {
        const data = await getTaxData();
        if (!controller.signal.aborted) {
          setTaxData(data);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Greška pri učitavanju podataka o porezu.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTaxData();
    return () => controller.abort();
  }, []);

  const filteredData = useMemo(() => {
    return taxData.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (item.firstName || "").toLowerCase().includes(searchLower) ||
        (item.lastName || "").toLowerCase().includes(searchLower);

      const matchesRole = !filterRole || item.role === filterRole;

      return matchesSearch && matchesRole;
    });
  }, [taxData, searchTerm, filterRole]);

  function handleResetFilters() {
    setSearchTerm("");
    setFilterRole("");
  }

  async function handleCollectTax() {
    if (!window.confirm("Da li ste sigurni da želite da pokrenete obračun poreza?")) return;

    setCollecting(true);
    try {
      await triggerTaxCollection();
      alert("Obračun poreza uspešno pokrenut.");
    } catch {
      alert("Greška pri pokretanju obračuna poreza.");
    } finally {
      setCollecting(false);
    }
  }

  function formatRSD(amount) {
    return new Intl.NumberFormat("sr-RS", {
      style: "currency",
      currency: "RSD",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  const roleLabel = { client: "Klijent", actuary: "Aktuar" };

  if (loading) {
    return (
      <div className="page-bg">
        <Sidebar />
        <div className="content-wrapper">
          <p style={{ color: "#475569", padding: "80px 24px", textAlign: "center" }}>Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-bg">
        <Sidebar />
        <div className="content-wrapper">
          <p style={{ color: "#f87171", padding: "80px 24px", textAlign: "center" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg">
      <Sidebar />

      <div className="content-wrapper">
        <div className="tax-card">
          <div className="tax-topbar">
            <div className="tax-title-block">
              <p className="tax-eyebrow">PRAĆENJE POREZA</p>
              <h1>Porez na kapitalnu dobit</h1>
              <p className="tax-subtitle">
                Pregled korisnika i obračunatog poreza na kapitalnu dobit.
              </p>
            </div>

            <button
              className="collect-btn"
              onClick={handleCollectTax}
              disabled={collecting}
            >
              {collecting ? "Obračun u toku..." : "Pokreni obračun poreza"}
            </button>
          </div>

          <div className="tax-toolbar">
            <div className="toolbar-row">
              <div className="search-wrapper">
                <span className="search-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  className="search"
                  placeholder="Pretraga po imenu ili prezimenu"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="toolbar-actions">
              <select
                className="role-filter"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">Svi korisnici</option>
                <option value="client">Klijenti</option>
                <option value="actuary">Aktuari</option>
              </select>

              <button className="reset-btn" onClick={handleResetFilters}>
                Reset filtera
              </button>
            </div>
          </div>

          <div className="filter-info">
            Pronađeno: <strong>{filteredData.length}</strong> / {taxData.length}{" "}
            korisnika
          </div>

          <div className="table-container">
            {filteredData.length === 0 ? (
              <div className="no-results">
                <p>Nema korisnika koji odgovaraju vašoj pretrazi.</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="tax-table">
                  <thead>
                    <tr>
                      <th>Ime</th>
                      <th>Prezime</th>
                      <th>Tip</th>
                      <th className="amount-header">Iznos poreza (RSD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item) => (
                      <tr key={item.id}>
                        <td>{item.firstName}</td>
                        <td>{item.lastName}</td>
                        <td>
                          <span className={`role-badge role-${item.role}`}>
                            {roleLabel[item.role] || item.role}
                          </span>
                        </td>
                        <td className="amount-cell">{formatRSD(item.taxAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaxDashboardPage;
