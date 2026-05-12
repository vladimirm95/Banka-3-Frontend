import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import MyFundsTab from "../components/portfolio/MyFundsTab.jsx";
import { formatCurrency } from "../utils/loanCalculations.js";
import {
  listPortfolio,
  getMyTaxInfo,
  setHoldingPublic,
  exerciseOption,
} from "../services/PortfolioService.js";
import { getAccounts } from "../services/AccountService.js";
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
    case "futures":
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
    const ms = unix < 1e12 ? unix * 1000 : unix;
    return new Date(ms).toLocaleString("sr-RS");
  } catch {
    return "—";
  }
}

export default function PortfolioPage() {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [taxInfo, setTaxInfo] = useState({
    paid_this_year_rsd: 0,
    unpaid_this_month_rsd: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const [actionError, setActionError] = useState("");

  const [publicModal, setPublicModal] = useState(null); // { holding, value }
  const [exerciseModal, setExerciseModal] = useState(null); // { holding, account }
  const [activeTab, setActiveTab] = useState("holdings");

  const role = sessionStorage.getItem("userRole") || "";
  const permissions = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("permissions") || "[]"); }
    catch { return []; }
  }, []);
  const isEmployee = role === "employee";
  const canExercise = isEmployee || permissions.includes("admin");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [portfolioData, tax, accs] = await Promise.all([
          listPortfolio(),
          getMyTaxInfo().catch(() => ({
            paid_this_year_rsd: 0,
            unpaid_this_month_rsd: 0,
          })),
          getAccounts().catch(() => []),
        ]);
        if (cancelled) return;
        setHoldings(Array.isArray(portfolioData) ? portfolioData : []);
        setTaxInfo(tax || { paid_this_year_rsd: 0, unpaid_this_month_rsd: 0 });
        setAccounts(Array.isArray(accs) ? accs : []);
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

  async function refreshHoldings() {
    try {
      const data = await listPortfolio();
      setHoldings(Array.isArray(data) ? data : []);
    } catch (e) {
      setActionError(e?.response?.data?.message || e.message || "Osvežavanje nije uspelo.");
    }
  }

  function navigateToSellOrder(h) {
    // Prefer listing_id when present; option holdings carry option_id.
    const params = new URLSearchParams();
    if (h.listing_id || h.listingId) {
      params.set("listingId", h.listing_id || h.listingId);
    }
    if (h.ticker) params.set("ticker", h.ticker);
    params.set("direction", "sell");
    // Spec §S37: a SELL order can't exceed the placer's holding. Pass the
    // current owned amount so CreateOrderPage caps the quantity input
    // client-side; the backend re-validates at fill time, but failing fast
    // beats waiting for the executor to reject.
    if (h.amount != null) params.set("max", String(h.amount));
    navigate(`/orders/new?${params.toString()}`);
  }

  async function handleSavePublic() {
    if (!publicModal) return;
    const target = parseInt(publicModal.value, 10);
    if (Number.isNaN(target) || target < 0 || target > Number(publicModal.holding.amount || 0)) {
      setActionError(`Javna količina mora biti broj između 0 i ${publicModal.holding.amount}.`);
      return;
    }
    setActionError("");
    setActionMsg("");
    try {
      await setHoldingPublic(publicModal.holding.id, target);
      // Refetch after save so the persisted value (per Phase 9 fix) is shown.
      await refreshHoldings();
      setPublicModal(null);
      setActionMsg("Javna količina je uspešno sačuvana.");
    } catch (e) {
      setActionError(
        e?.response?.data?.error || e?.response?.data?.message || e.message || "Čuvanje nije uspelo."
      );
    }
  }

  async function handleExerciseConfirm() {
    if (!exerciseModal) return;
    const account = (exerciseModal.account || "").trim();
    if (!account) {
      setActionError("Unesite broj računa za isplatu.");
      return;
    }
    setActionError("");
    setActionMsg("");
    try {
      await exerciseOption(
        exerciseModal.holding.option_id || exerciseModal.holding.id,
        account
      );
      await refreshHoldings();
      setExerciseModal(null);
      setActionMsg("Opcija je uspešno iskorišćena.");
    } catch (e) {
      setActionError(
        e?.response?.data?.error || e?.response?.data?.message || e.message || "Akcija nije uspela."
      );
    }
  }

  return (
    <div className="portfolio-page pf-page">
      <Sidebar />

      <h1 className="portfolio-title pf-title">Moj portfolio</h1>

      <div
        className="pf-tabs"
        role="tablist"
        aria-label="Portfolio sekcije"
        onKeyDown={(e) => {
          const order = ["holdings", "funds"];
          const idx = order.indexOf(activeTab);
          let next = null;
          if (e.key === "ArrowRight") next = order[(idx + 1) % order.length];
          else if (e.key === "ArrowLeft")
            next = order[(idx - 1 + order.length) % order.length];
          else if (e.key === "Home") next = order[0];
          else if (e.key === "End") next = order[order.length - 1];
          if (next) {
            e.preventDefault();
            setActiveTab(next);
            document.getElementById(`pf-tab-${next}`)?.focus();
          }
        }}
      >
        <button
          type="button"
          role="tab"
          id="pf-tab-holdings"
          aria-selected={activeTab === "holdings"}
          aria-controls="pf-panel-holdings"
          tabIndex={activeTab === "holdings" ? 0 : -1}
          className={`pf-tab${activeTab === "holdings" ? " pf-tab--active" : ""}`}
          onClick={() => setActiveTab("holdings")}
        >
          Hartije
        </button>
        <button
          type="button"
          role="tab"
          id="pf-tab-funds"
          aria-selected={activeTab === "funds"}
          aria-controls="pf-panel-funds"
          tabIndex={activeTab === "funds" ? 0 : -1}
          className={`pf-tab${activeTab === "funds" ? " pf-tab--active" : ""}`}
          onClick={() => setActiveTab("funds")}
        >
          Moji fondovi
        </button>
      </div>

      {activeTab === "funds" ? (
        <div
          id="pf-panel-funds"
          role="tabpanel"
          aria-labelledby="pf-tab-funds"
        >
          <MyFundsTab />
        </div>
      ) : (
      <div
        id="pf-panel-holdings"
        role="tabpanel"
        aria-labelledby="pf-tab-holdings"
      >
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

      {actionMsg && <div className="pf-banner pf-banner--ok">{actionMsg}</div>}
      {actionError && <div className="pf-banner pf-banner--error">{actionError}</div>}

      {loading ? (
        <div className="portfolio-empty pf-loading">Učitavanje…</div>
      ) : error ? (
        <div className="portfolio-empty pf-error">{error}</div>
      ) : (
        // Tabela se uvek renderuje (čak i prazna) — to drži zaglavlja
        // dostupnim za assistive tech / e2e selektore i izbegava skok
        // layout-a kad poslednja hartija nestane iz portfolija.
        <div className="portfolio-table-wrapper">
          <table className="portfolio-table pf-table">
            <thead>
              <tr>
                <th>Tip</th>
                <th>Ticker</th>
                <th>Količina</th>
                <th>Raspoloživo</th>
                <th>Avg cena</th>
                <th>Trenutna</th>
                <th>Profit</th>
                <th>Profit %</th>
                <th>Modifikovano</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {holdings.length === 0 && (
                <tr>
                  <td colSpan={10} className="pf-empty">
                    Nemate hartija od vrednosti u portfoliju.
                  </td>
                </tr>
              )}
              {holdings.map((h) => {
                const profit = Number(h.profit) || 0;
                const isProfit = profit >= 0;
                const reserved = Number(h.reserved_quantity ?? h.reservedQuantity) || 0;
                const available = Math.max(0, Number(h.amount || 0) - reserved);
                const avgMajor = (Number(h.avg_cost) || 0) / 100;
                const profitPct = avgMajor > 0 && Number(h.amount) > 0
                  ? (profit / 100) / (avgMajor * Number(h.amount)) * 100
                  : 0;
                const exerciseExpired = h.asset_type === "option"
                  && h.settlement_date
                  && (h.settlement_date * 1000 < Date.now());
                const canShowExercise =
                  canExercise && h.asset_type === "option" && !exerciseExpired;

                return (
                  <tr key={h.id}>
                    <td>
                      <span className="security-type-badge">
                        {assetTypeLabel(h.asset_type)}
                      </span>
                    </td>
                    <td className="ticker">{h.ticker}</td>
                    <td>{h.amount}</td>
                    <td>{available}</td>
                    <td>{fmt(h.avg_cost)}</td>
                    <td>{fmt(h.current_price)}</td>
                    <td className={`pl ${isProfit ? "pl--profit" : "pl--loss"}`}>
                      {isProfit ? "+" : ""}
                      {fmt(profit)}
                    </td>
                    <td className={`pl ${isProfit ? "pl--profit" : "pl--loss"}`}>
                      {isProfit ? "+" : ""}{profitPct.toFixed(2)}%
                    </td>
                    <td>{fmtTimestamp(h.last_modified_unix)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {h.asset_type === "stock" && (
                          <button
                            className="sell-btn pf-public-btn"
                            onClick={() =>
                              setPublicModal({
                                holding: h,
                                value: String(Number(h.public_amount) || 0),
                              })
                            }
                          >
                            {Number(h.public_amount) > 0
                              ? `Javno (${h.public_amount})`
                              : "Učini javnim"}
                          </button>
                        )}
                        <button
                          className="sell-btn pf-sell-btn"
                          onClick={() => navigateToSellOrder(h)}
                          disabled={available <= 0}
                          title={available <= 0
                            ? "Sva raspoloživa količina je već u procesu prodaje"
                            : "Otvori formu za prodaju"
                          }
                        >
                          Prodaj
                        </button>
                        {canShowExercise && (
                          <button
                            className="sell-btn pf-exercise-btn"
                            onClick={() =>
                              setExerciseModal({
                                holding: h,
                                account: h.account_number || "",
                              })
                            }
                          >
                            Iskoristi opciju
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
      )}

      {/* publicModal / exerciseModal */}
      {publicModal && (
        <div className="pf-overlay" onClick={() => setPublicModal(null)}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Javna količina za {publicModal.holding.ticker}</h2>
            <p className="pf-modal-hint">
              Postavlja koliko od ukupno {publicModal.holding.amount} hartija će biti
              vidljivo na OTC tržištu. Unesite 0 da uklonite javni status.
            </p>
            <input
              type="number"
              min="0"
              max={publicModal.holding.amount}
              step="1"
              value={publicModal.value}
              onChange={(e) =>
                setPublicModal({ ...publicModal, value: e.target.value })
              }
              className="pf-modal-input"
            />
            <div className="pf-modal-actions">
              <button className="pf-btn-secondary" onClick={() => setPublicModal(null)}>
                Otkaži
              </button>
              <button className="pf-btn-primary" onClick={handleSavePublic}>
                Sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}

      {exerciseModal && (
        <div className="pf-overlay" onClick={() => setExerciseModal(null)}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Iskorišćavanje opcije {exerciseModal.holding.ticker}</h2>
            <p className="pf-modal-hint">
              Izaberite račun na koji će biti uplaćen prinos od izvršenja opcije.
            </p>
            <select
              className="pf-modal-input"
              value={exerciseModal.account}
              onChange={(e) =>
                setExerciseModal({ ...exerciseModal, account: e.target.value })
              }
            >
              <option value="">— Izaberite račun —</option>
              {accounts.map((a) => (
                <option key={a.account_number} value={a.account_number}>
                  {a.account_number} · {a.currency}
                </option>
              ))}
            </select>
            <div className="pf-modal-actions">
              <button className="pf-btn-secondary" onClick={() => setExerciseModal(null)}>
                Otkaži
              </button>
              <button className="pf-btn-primary" onClick={handleExerciseConfirm}>
                Iskoristi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
