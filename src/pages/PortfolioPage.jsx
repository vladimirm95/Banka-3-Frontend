import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { formatCurrency } from "../utils/loanCalculations.js";
import {
  listPortfolio,
  getMyTaxInfo,
  setHoldingPublic,
  sellHolding,
  exerciseOption,
} from "../services/PortfolioService.js";
import "./PortfolioPage.css";

// Backend amounts (avg_cost, current_price, profit, public_amount, tax) come
// in minor units. Convert and delegate to the shared formatter so RSD/USD
// renders consistently with the rest of the app.
function fmt(minor, currency = "RSD") {
  const major = (Number(minor) || 0) / 100;
  return formatCurrency(major, currency);
}

function assetTypeLabel(t) {
  switch (t) {
    case "stock":
      return "Akcija";
    case "future":
      return "Future";
    case "forex":
      return "Forex";
    case "option":
      return "Opcija";
    default:
      return t || "—";
  }
}

function fmtTimestamp(unix) {
  if (!unix) return "—";
  try {
    return new Date(Number(unix) * 1000).toLocaleString("sr-RS");
  } catch {
    return "—";
  }
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState([]);
  const [taxInfo, setTaxInfo] = useState({
    paid_this_year_rsd: 0,
    unpaid_this_month_rsd: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState("");

  useEffect(() => {
    setRole(sessionStorage.getItem("userRole") || "");
    let cancelled = false;
    (async () => {
      try {
        const [portfolioData, tax] = await Promise.all([
          listPortfolio(),
          getMyTaxInfo().catch(() => ({
            paid_this_year_rsd: 0,
            unpaid_this_month_rsd: 0,
          })),
        ]);
        if (cancelled) return;
        setHoldings(Array.isArray(portfolioData) ? portfolioData : []);
        setTaxInfo(tax || { paid_this_year_rsd: 0, unpaid_this_month_rsd: 0 });
      } catch (e) {
        if (!cancelled) setError(e.message || "Greška pri učitavanju portfolia.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalProfit = holdings.reduce(
    (sum, h) => sum + (Number(h.profit) || 0),
    0
  );

  const refreshHoldings = async () => {
    const data = await listPortfolio();
    setHoldings(Array.isArray(data) ? data : []);
  };

  const handleTogglePublic = async (h) => {
    const current = Number(h.public_amount) || 0;
    const target = current > 0 ? 0 : Math.max(1, Number(h.amount) || 0);
    const input = window.prompt(
      `Javna količina (0 = privatno, max ${h.amount}):`,
      String(target)
    );
    if (input == null) return;
    const next = parseInt(input, 10);
    if (Number.isNaN(next) || next < 0) return;
    try {
      await setHoldingPublic(h.id, next);
      await refreshHoldings();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  };

  const handleSell = async (h) => {
    const account = window.prompt(
      "Broj računa za naplatu (npr. 333000100000000420):",
      h.account_number || ""
    );
    if (!account) return;
    const qtyStr = window.prompt(
      `Količina za prodaju (max ${h.amount}):`,
      String(h.amount)
    );
    if (!qtyStr) return;
    const qty = parseInt(qtyStr, 10);
    if (Number.isNaN(qty) || qty <= 0) return;
    try {
      await sellHolding({
        holding_id: h.id,
        account_number: account,
        order_type: "market",
        quantity: qty,
      });
      await refreshHoldings();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  };

  const handleExercise = async (h) => {
    const account = window.prompt(
      "Broj računa za isplatu:",
      h.account_number || ""
    );
    if (!account) return;
    try {
      await exerciseOption(h.option_id || h.id, account);
      await refreshHoldings();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  };

  const isClient = role === "client";

  return (
    <div className="portfolio-page pf-page">
      <Sidebar />

      <h1 className="portfolio-title pf-title">Moj portfolio</h1>

      <div className="portfolio-summaries pf-summary">
        <div
          className={`portfolio-summary pf-summary-card ${
            totalProfit >= 0 ? "summary--profit" : "summary--loss"
          }`}
        >
          <span className="summary-label">Ukupan profit</span>
          <span className="summary-value pf-summary-value">
            {totalProfit >= 0 ? "+" : ""}
            {fmt(totalProfit)}
          </span>
        </div>

        <div className="portfolio-summary summary--neutral pf-summary-card">
          <span className="summary-label">Plaćen porez (godina)</span>
          <span className="summary-value summary-value--neutral pf-summary-value">
            {fmt(taxInfo.paid_this_year_rsd)}
          </span>
        </div>

        <div className="portfolio-summary summary--neutral pf-summary-card">
          <span className="summary-label">Neplaćen porez (mesec)</span>
          <span className="summary-value summary-value--neutral pf-summary-value">
            {fmt(taxInfo.unpaid_this_month_rsd)}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="portfolio-empty pf-loading">Učitavanje…</div>
      ) : error ? (
        <div className="portfolio-empty pf-error">{error}</div>
      ) : holdings.length === 0 ? (
        <div className="portfolio-empty pf-empty">
          <p>Nemate hartija od vrednosti u portfoliju.</p>
        </div>
      ) : (
        <div className="portfolio-table-wrapper">
          <table className="portfolio-table pf-table">
            <thead>
              <tr>
                <th>Tip</th>
                <th>Ticker</th>
                <th>Količina</th>
                <th>Avg cena</th>
                <th>Trenutna</th>
                <th>Profit</th>
                <th>Modifikovano</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const profit = Number(h.profit) || 0;
                const isProfit = profit >= 0;
                return (
                  <tr key={h.id}>
                    <td>
                      <span className="security-type-badge">
                        {assetTypeLabel(h.asset_type)}
                      </span>
                    </td>
                    <td className="ticker">{h.ticker}</td>
                    <td>{h.amount}</td>
                    <td>{fmt(h.avg_cost)}</td>
                    <td>{fmt(h.current_price)}</td>
                    <td
                      className={`pl ${isProfit ? "pl--profit" : "pl--loss"}`}
                    >
                      {isProfit ? "+" : ""}
                      {fmt(profit)}
                    </td>
                    <td>{fmtTimestamp(h.last_modified_unix)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {h.asset_type === "stock" && (
                          <button
                            className="sell-btn pf-public-btn"
                            onClick={() => handleTogglePublic(h)}
                          >
                            {Number(h.public_amount) > 0
                              ? `Public (${h.public_amount})`
                              : "Public"}
                          </button>
                        )}
                        <button
                          className="sell-btn pf-sell-btn"
                          onClick={() => handleSell(h)}
                        >
                          Sell
                        </button>
                        {!isClient && h.asset_type === "option" && (
                          <button
                            className="sell-btn pf-exercise-btn"
                            onClick={() => handleExercise(h)}
                          >
                            Iskoristi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
