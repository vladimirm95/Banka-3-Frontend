import { useEffect, useMemo, useState } from "react";
import { getTaxDebts, runTaxCollection } from "../services/TaxService";
import Sidebar from "../components/Sidebar.jsx";
import "./TaxDashboardPage.css";

function formatRSD(amount) {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

function TaxDashboardPage() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // pending (form) vs applied (last submitted) — matches the spec's
  // "type → click Pretraži" flow.
  const [teamPending, setTeamPending] = useState("");
  const [namePending, setNamePending] = useState("");
  const [team, setTeam] = useState("");
  const [name, setName] = useState("");

  const [collecting, setCollecting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTaxDebts({ team, name })
      .then((data) => {
        if (!cancelled) {
          setDebts(data);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Greška pri učitavanju podataka o porezu.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [team, name]);

  const totalUnpaid = useMemo(
    () => debts.reduce((sum, d) => sum + (d.unpaidRsd || 0), 0),
    [debts],
  );
  const totalPaid = useMemo(
    () => debts.reduce((sum, d) => sum + (d.paidRsd || 0), 0),
    [debts],
  );

  function handleSearch(e) {
    e?.preventDefault();
    setTeam(teamPending);
    setName(namePending.trim());
  }

  function handleResetFilters() {
    setTeamPending("");
    setNamePending("");
    setTeam("");
    setName("");
  }

  async function handleCollectTax() {
    if (!window.confirm("Da li ste sigurni da želite da pokrenete obračun poreza?")) return;
    setCollecting(true);
    setRunError("");
    try {
      const res = await runTaxCollection();
      setRunResult(res);
      // Refresh the debts table so the post-run state is visible.
      const fresh = await getTaxDebts({ team, name });
      setDebts(fresh);
    } catch {
      setRunError("Greška pri pokretanju obračuna poreza.");
    } finally {
      setCollecting(false);
    }
  }

  return (
    <div className="page-bg">
      <Sidebar />

      <div className="content-wrapper">
        <div className="tax-card">
          <div className="tax-topbar">
            <div className="tax-title-block">
              <p className="tax-eyebrow">PRAĆENJE POREZA</p>
              <h1 className="tax-title">Porez tracking — kapitalna dobit</h1>
              <p className="tax-subtitle">
                Pregled korisnika i obračunatog poreza na kapitalnu dobit.
              </p>
            </div>
          </div>

          <div className="tax-summary">
            <div className="tax-summary-item">
              <span className="tax-summary-label">Ukupan neplaćen porez</span>
              <span className="tax-summary-value">{formatRSD(totalUnpaid)}</span>
            </div>
            <div className="tax-summary-item">
              <span className="tax-summary-label">Ukupan plaćen porez</span>
              <span className="tax-summary-value">{formatRSD(totalPaid)}</span>
            </div>
          </div>

          <form className="tax-filters" onSubmit={handleSearch}>
            <select
              className="role-filter"
              value={teamPending}
              onChange={(e) => setTeamPending(e.target.value)}
            >
              <option value="">Svi korisnici</option>
              <option value="client">Klijenti</option>
              <option value="actuary">Aktuari</option>
            </select>

            <input
              className="search"
              placeholder="Ime ili prezime"
              value={namePending}
              onChange={(e) => setNamePending(e.target.value)}
            />

            <button type="submit" className="search-btn">Pretraži</button>
            <button type="button" className="reset-btn" onClick={handleResetFilters}>
              Reset filtera
            </button>
          </form>

          <div className="tax-run-card">
            <div>
              <h3>Mesečni obračun</h3>
              <p className="tax-run-subtitle">
                Naplata neplaćenog poreza za sve korisnike sa dovoljnim sredstvima.
              </p>
            </div>
            <button
              className="collect-btn"
              onClick={handleCollectTax}
              disabled={collecting}
            >
              {collecting ? "Obračun u toku..." : "Pokreni obračun"}
            </button>
          </div>

          {runError && <p className="tax-run-error">{runError}</p>}
          {runResult && (
            <div className="tax-run-result">
              Obračun završen{runResult.period ? ` (${runResult.period})` : ""}:
              naplaćeno <strong>{formatRSD(runResult.collectedRsd)}</strong>{" "}
              od ukupnog duga {formatRSD(runResult.totalDebtRsd)} —{" "}
              {runResult.rowsPaid} stavki / {runResult.accountsPaid} računa
              ({runResult.insufficient} bez dovoljno sredstava).
            </div>
          )}

          <div className="filter-info">
            Prikazano: <strong>{debts.length}</strong> korisnika
          </div>

          <div className="table-container">
            {loading ? (
              <p className="no-results">Učitavanje...</p>
            ) : error ? (
              <p className="tax-run-error">{error}</p>
            ) : debts.length === 0 ? (
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
                      <th>Email / ID</th>
                      <th>Tip</th>
                      <th className="amount-header">Plaćeno (RSD)</th>
                      <th className="amount-header">Neplaćeno (RSD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts.map((d) => (
                      <tr key={d.id}>
                        <td>{d.firstName}</td>
                        <td>{d.lastName}</td>
                        <td className="email-cell">#{d.id}</td>
                        <td>
                          <span className={`role-badge role-${d.team}`}>{d.team}</span>
                        </td>
                        <td className="amount-cell tax-pos">{formatRSD(d.paidRsd)}</td>
                        <td className="amount-cell tax-neg">{formatRSD(d.unpaidRsd)}</td>
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
