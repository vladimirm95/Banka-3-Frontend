import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { getActuaryProfits } from "../services/ActuaryService.js";
import { formatCurrency } from "../utils/loanCalculations.js";
import "./ProfitActuariesPage.css";

export default function ProfitActuariesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getActuaryProfits();
        if (cancelled) return;
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Greška pri učitavanju profita.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.firstName} ${r.lastName}`.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="profit-page">
      <Sidebar />

      <h1 className="profit-title">Profit Banke — Performance aktuara</h1>

      <div className="profit-toolbar">
        <label htmlFor="profit-search" className="profit-search-label">
          Pretraga (ime ili prezime)
        </label>
        <input
          id="profit-search"
          className="profit-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="npr. Milan"
        />
      </div>

      {loading ? (
        <div className="profit-state">Učitavanje…</div>
      ) : error ? (
        <div className="profit-state profit-state--error">{error}</div>
      ) : (
        <div className="profit-table-wrapper">
          <table className="profit-table" aria-describedby="profit-search-label">
            <thead>
              <tr>
                <th>Ime</th>
                <th>Prezime</th>
                <th className="profit-amount-col">Profit (RSD)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="profit-empty">
                    {rows.length === 0
                      ? "Nema podataka o aktuarima."
                      : "Nijedan aktuar ne odgovara pretrazi."}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const positive = r.profit >= 0;
                  return (
                    <tr key={r.id}>
                      <td>{r.firstName}</td>
                      <td>{r.lastName}</td>
                      <td
                        className={`profit-amount-col profit-value ${
                          positive ? "profit-value--ok" : "profit-value--loss"
                        }`}
                      >
                        {positive ? "+" : ""}
                        {formatCurrency(r.profit, "RSD")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
