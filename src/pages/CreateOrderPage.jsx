import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { getAccounts, getTradingAccounts } from "../services/AccountService.js";
import { getSecurityDetail } from "../services/SecurityDetailService.js";
import { getExchanges } from "../services/ExchangeService.js";
import {
  createOrder,
  toMinor,
  ORDER_TYPE_LABEL,
  ORDER_DIRECTION_LABEL,
} from "../services/OrderService.js";
import { formatCurrency } from "../utils/loanCalculations.js";
import { computeExchangeStatus, findExchangeByAcronym } from "../utils/exchangeHours.js";
import "./CreateOrderPage.css";

// Spec p.49: order type derives from which price fields the user fills in —
// Market (none), Limit (limit only), Stop (stop only), Stop-Limit (both).
// We compute it instead of asking, so the UI matches the placement rules
// strictly enforced by trading/orders.go validatePriceFields.
function deriveOrderType(limitPrice, stopPrice) {
  const hasL = limitPrice !== "" && Number(limitPrice) > 0;
  const hasS = stopPrice !== "" && Number(stopPrice) > 0;
  if (hasL && hasS) return "stop_limit";
  if (hasL) return "limit";
  if (hasS) return "stop";
  return "market";
}

function isPastSettlement(value) {
  if (!value) return false;
  let t;
  if (typeof value === "number") {
    t = value < 1e12 ? value * 1000 : value;
  } else {
    t = Date.parse(value);
  }
  if (!Number.isFinite(t)) return false;
  return t < Date.now();
}

// Spec p.55: Market/Stop commission = min(14% * approx, $7).
// Limit/Stop-Limit commission = min(24% * approx, $12).
// Employees never pay commission (they trade off bank accounts) — see
// RucnoTestiranjeCelina3 §S44.
function commissionFor(orderType, totalMajor, isEmployee) {
  if (isEmployee) return 0;
  if (totalMajor <= 0) return 0;
  if (orderType === "limit" || orderType === "stop_limit") {
    return Math.min(0.24 * totalMajor, 12);
  }
  return Math.min(0.14 * totalMajor, 7);
}

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const listingIdParam = params.get("listingId");
  const tickerParam = params.get("ticker") || "";
  const direction = (params.get("direction") || "buy").toLowerCase();

  const role = sessionStorage.getItem("userRole") || "";
  const permissions = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("permissions") || "[]"); }
    catch { return []; }
  }, []);
  const isClient = role === "client";
  const isEmployee = role === "employee";
  const canMargin = permissions.includes("margin_trading") || permissions.includes("admin");

  const [security, setSecurity] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const orderType = deriveOrderType(limitPrice, stopPrice);
  const [accountNumber, setAccountNumber] = useState("");
  const [allOrNone, setAllOrNone] = useState(false);
  const [margin, setMargin] = useState(false);
  const [errors, setErrors] = useState({});

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Resolve security, the user's accounts, and the exchange list in
        // parallel — all three are needed before the form is interactive
        // (exchanges drive the closed-market warning, see §S45).
        const securityKey = tickerParam || listingIdParam;
        // Spec p.55 — Takeaway 7: employees trade off the bank's internal
        // trading ledger (system@banka3.rs), not arbitrary client accounts.
        // Clients keep their own accounts here; admins follow the employee
        // path because they're seated as employees in this codebase.
        const accountsLoader = role === "employee" ? getTradingAccounts : getAccounts;
        const [sec, accs, exs] = await Promise.all([
          securityKey ? getSecurityDetail(securityKey).catch(() => null) : Promise.resolve(null),
          accountsLoader().catch(() => []),
          getExchanges().catch(() => []),
        ]);
        if (cancelled) return;
        setSecurity(sec);
        setAccounts(Array.isArray(accs) ? accs : []);
        setExchanges(Array.isArray(exs) ? exs : []);
        if (Array.isArray(accs) && accs.length > 0) {
          // Preselect first account that matches the security currency where
          // possible — keeps the displayed "Procena troškova" in a single
          // currency on first render.
          const secCurrency = (sec?.currency || "").toUpperCase();
          const matched = secCurrency
            ? accs.find((a) => (a.currency || "").toUpperCase() === secCurrency)
            : null;
          setAccountNumber((matched || accs[0]).account_number);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e.message || "Greška pri učitavanju.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tickerParam, listingIdParam]);

  const securityCurrency = useMemo(() => {
    if (!security) return "USD";
    if (security.currency) return security.currency;
    return "USD";
  }, [security]);

  const pricePerUnit = useMemo(() => {
    if (orderType === "limit" || orderType === "stop_limit") {
      return Number(limitPrice) || 0;
    }
    if (orderType === "stop") {
      return Number(stopPrice) || 0;
    }
    return security?.price || 0;
  }, [orderType, limitPrice, stopPrice, security]);

  // contractSize comes from the listing detail (1 for stocks/forex, lot size
  // for futures). Without it, the "approximate total" estimate displayed below
  // is off by a factor of contract_size on futures orders.
  const contractSize = security?.contractSize && security.contractSize > 0 ? security.contractSize : 1;

  const approxTotalMajor = useMemo(() => {
    return Math.max(0, pricePerUnit * Number(quantity || 0) * contractSize);
  }, [pricePerUnit, quantity, contractSize]);

  const commissionMajor = commissionFor(orderType, approxTotalMajor, isEmployee);
  const grandTotalMajor = approxTotalMajor + commissionMajor;

  const settlementExpired = isPastSettlement(security?.settlementDate);

  // Spec §S45: warn before submit when the exchange is closed. Forex has no
  // exchange and is always tradable; same for securities whose exchange we
  // can't resolve (we don't want to false-positive a warning on missing data).
  // Market orders are the harder case — the backend rejects them when the
  // market is closed (see §S46), so we surface that as a hard block here too.
  const exchangeStatus = useMemo(() => {
    if (!security || security.type === "forex" || !security.exchange) return null;
    const ex = findExchangeByAcronym(exchanges, security.exchange);
    return ex ? computeExchangeStatus(ex) : null;
  }, [security, exchanges]);
  const exchangeClosed = exchangeStatus != null && !exchangeStatus.open;

  function validate() {
    const errs = {};
    const q = Number(quantity);
    if (!Number.isFinite(q) || q < 1) {
      errs.quantity = "Količina mora biti najmanje 1.";
    }
    if (orderType === "limit" || orderType === "stop_limit") {
      const lp = Number(limitPrice);
      if (!Number.isFinite(lp) || lp <= 0) errs.limitPrice = "Limit cena mora biti veća od 0.";
    }
    if (orderType === "stop" || orderType === "stop_limit") {
      const sp = Number(stopPrice);
      if (!Number.isFinite(sp) || sp <= 0) errs.stopPrice = "Stop cena mora biti veća od 0.";
    }
    if (!accountNumber) {
      errs.accountNumber = "Izaberite račun za naplatu.";
    }
    if (settlementExpired) {
      errs.security = "Ugovor je istekao — kreiranje naloga nije moguće.";
    }
    if (margin && !canMargin) {
      errs.margin = "Nemate dozvolu za margin trgovanje.";
    }
    // Block market orders pre-flight when the exchange is closed; the backend
    // rejects them too (server.go: "exchange is closed; market orders cannot
    // be placed"), so failing fast here saves a round-trip and tells the user
    // why. Limit/stop variants are still allowed — they wait for a trigger.
    if (orderType === "market" && exchangeClosed) {
      errs.exchange = "Berza je zatvorena — Market nalozi se ne mogu kreirati. Koristite Limit/Stop ili sačekajte otvaranje.";
    }
    return errs;
  }

  function handleContinue(e) {
    e?.preventDefault();
    setSubmitError("");
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setShowConfirm(true);
    }
  }

  async function handleConfirmContinue() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        order_type: orderType,
        direction,
        quantity: Number(quantity),
        all_or_none: allOrNone,
        margin: margin && canMargin,
      };
      // Resolve the asset id from the security detail. Fall back to the URL
      // parameter when the detail fetch failed but the user still wants to
      // submit (the backend will reject an unknown listing_id, which #28 in
      // TestoviCelina3 covers).
      const assetId = security?.id ?? (listingIdParam ? Number(listingIdParam) : null);
      if (security?.type === "option") {
        payload.option_id = assetId;
      } else if (security?.type === "forex") {
        payload.forex_pair_id = assetId;
      } else if (assetId != null) {
        payload.listing_id = assetId;
      }
      if (accountNumber) payload.account_number = accountNumber;
      if (orderType === "limit" || orderType === "stop_limit") {
        payload.limit_price = toMinor(limitPrice);
      }
      if (orderType === "stop" || orderType === "stop_limit") {
        payload.stop_price = toMinor(stopPrice);
      }

      await createOrder(payload);
      setShowConfirm(false);
      navigate("/orders/my", { replace: true });
    } catch (err) {
      const raw =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        err?.response?.data ||
        err.message;
      const msg = String(raw || "Greška pri kreiranju naloga.").trim();
      setShowConfirm(false);
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="co-page">
        <Sidebar />
        <div className="co-loading">Učitavanje…</div>
      </div>
    );
  }

  const showLimitField = orderType === "limit" || orderType === "stop_limit";
  const showStopField = orderType === "stop" || orderType === "stop_limit";
  const directionLabel = ORDER_DIRECTION_LABEL[direction] || direction;
  const orderTypeLabel = ORDER_TYPE_LABEL[orderType] || orderType;

  return (
    <div className="co-page">
      <Sidebar />

      <div className="co-content">
        <div className="co-header">
          <button className="co-back-btn" onClick={() => navigate(-1)} aria-label="Nazad">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <p className="co-eyebrow">Kreiranje naloga</p>
            <h1 className="co-title">
              {directionLabel} — {security?.ticker || tickerParam || "Hartija"}
            </h1>
            {security?.name && <p className="co-subtitle">{security.name}</p>}
          </div>
        </div>

        {loadError && <div className="co-banner co-banner--error">{loadError}</div>}
        {settlementExpired && (
          <div className="co-banner co-banner--warning">
            Ugovor za {security?.ticker} je istekao (settlement date je u prošlosti).
            Kreiranje naloga je onemogućeno.
          </div>
        )}
        {exchangeClosed && (
          <div className="co-banner co-banner--warning">
            Berza {security?.exchange || ""} je trenutno zatvorena
            ({exchangeStatus?.label || "zatvorena"}). Market nalozi će biti odbijeni;
            Limit/Stop nalozi se mogu kreirati i čekaće okidač.
          </div>
        )}
        {errors.exchange && <div className="co-banner co-banner--error">{errors.exchange}</div>}
        {isEmployee && (
          <div className="co-banner co-banner--info">
            Trguje se sa bankinog trading računa. Provizija za zaposlene je 0.
          </div>
        )}

        {security && (
          <div className="co-security-card">
            <div>
              <span className="co-security-label">Ticker</span>
              <span className="co-security-value">{security.ticker}</span>
            </div>
            <div>
              <span className="co-security-label">Cena</span>
              <span className="co-security-value">
                {formatCurrency(security.price || 0, securityCurrency)}
              </span>
            </div>
            <div>
              <span className="co-security-label">Ask</span>
              <span className="co-security-value">{formatCurrency(security.ask || 0, securityCurrency)}</span>
            </div>
            <div>
              <span className="co-security-label">Bid</span>
              <span className="co-security-value">{formatCurrency(security.bid || 0, securityCurrency)}</span>
            </div>
            <div>
              <span className="co-security-label">Berza</span>
              <span className="co-security-value">{security.exchange || "—"}</span>
            </div>
          </div>
        )}

        <form className="co-form" onSubmit={handleContinue} noValidate>
          <div className="co-row">
            <div className="co-field">
              <span className="co-field-label">Tip naloga</span>
              <span className={`co-type-badge co-type-badge--${orderType}`}>
                {orderTypeLabel}
              </span>
              <span className="co-hint">
                {orderType === "market" && "Bez limita/stop-a — popunjava se po trenutnoj tržišnoj ceni."}
                {orderType === "limit" && "Limit cena unesena — kupovina samo dok je ask ≤ limit (sell: bid ≥ limit)."}
                {orderType === "stop" && "Stop unet — okida se kada cena dostigne stop, zatim se ponaša kao Market."}
                {orderType === "stop_limit" && "Stop + Limit — okida se na stop, zatim se ponaša kao Limit."}
              </span>
            </div>

            <label className="co-field">
              <span className="co-field-label">Količina</span>
              <input
                className={`co-input ${errors.quantity ? "co-input--error" : ""}`}
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  if (errors.quantity) setErrors((p) => ({ ...p, quantity: "" }));
                }}
              />
              {errors.quantity && <span className="co-error">{errors.quantity}</span>}
            </label>
          </div>

          <div className="co-row">
            <label className="co-field">
              <span className="co-field-label">Limit vrednost ({securityCurrency})</span>
              <input
                className={`co-input ${errors.limitPrice ? "co-input--error" : ""}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="prazno za market"
                value={limitPrice}
                onChange={(e) => {
                  setLimitPrice(e.target.value);
                  if (errors.limitPrice) setErrors((p) => ({ ...p, limitPrice: "" }));
                }}
              />
              {errors.limitPrice && <span className="co-error">{errors.limitPrice}</span>}
            </label>
            <label className="co-field">
              <span className="co-field-label">Stop vrednost ({securityCurrency})</span>
              <input
                className={`co-input ${errors.stopPrice ? "co-input--error" : ""}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="prazno za market"
                value={stopPrice}
                onChange={(e) => {
                  setStopPrice(e.target.value);
                  if (errors.stopPrice) setErrors((p) => ({ ...p, stopPrice: "" }));
                }}
              />
              {errors.stopPrice && <span className="co-error">{errors.stopPrice}</span>}
            </label>
          </div>

          <div className="co-row">
            <label className="co-field">
              <span className="co-field-label">
                {isEmployee ? "Bankin trading račun" : "Račun za naplatu"}
              </span>
              <select
                className={`co-input ${errors.accountNumber ? "co-input--error" : ""}`}
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  if (errors.accountNumber) setErrors((p) => ({ ...p, accountNumber: "" }));
                }}
              >
                <option value="">— Izaberite račun —</option>
                {accounts.map((a) => (
                  <option key={a.account_number} value={a.account_number}>
                    {a.account_number} · {a.currency}
                    {typeof a.balance === "number" ? ` · ${a.balance.toLocaleString("sr-RS")}` : ""}
                  </option>
                ))}
              </select>
              {errors.accountNumber && <span className="co-error">{errors.accountNumber}</span>}
              {accounts.length === 0 && (
                <span className="co-hint">
                  Nema dostupnih računa za prikaz. Backend će pokušati da resolvuje
                  bankin trading račun po valuti hartije.
                </span>
              )}
            </label>
          </div>

          <div className="co-row co-row--checks">
            <label className="co-check">
              <input
                type="checkbox"
                checked={allOrNone}
                onChange={(e) => setAllOrNone(e.target.checked)}
              />
              <span>All or None — nalog se izvršava samo ako se može u potpunosti.</span>
            </label>

            <label className={`co-check ${!canMargin ? "co-check--disabled" : ""}`}>
              <input
                type="checkbox"
                checked={margin}
                disabled={!canMargin}
                onChange={(e) => setMargin(e.target.checked)}
              />
              <span>
                Margin {canMargin ? "" : "(nemate aktivan margin nalog ili dozvolu)"}
              </span>
            </label>
            {errors.margin && <span className="co-error">{errors.margin}</span>}
          </div>

          <div className="co-estimate">
            <h3>Procena troškova</h3>
            <dl className="co-estimate-list">
              <div>
                <dt>Cena po jedinici</dt>
                <dd>{formatCurrency(pricePerUnit, securityCurrency)}</dd>
              </div>
              <div>
                <dt>Količina</dt>
                <dd>{Number(quantity || 0)}</dd>
              </div>
              <div>
                <dt>Aproks. ukupno (cena × količina)</dt>
                <dd>{formatCurrency(approxTotalMajor, securityCurrency)}</dd>
              </div>
              <div>
                <dt>Provizija</dt>
                <dd>
                  {isEmployee
                    ? "0 (zaposleni)"
                    : formatCurrency(commissionMajor, securityCurrency)}
                </dd>
              </div>
              <div>
                <dt>Ukupno</dt>
                <dd className="co-estimate-total">
                  {formatCurrency(grandTotalMajor, securityCurrency)}
                </dd>
              </div>
            </dl>
            {isClient && (
              <p className="co-hint">
                Ako račun nije u istoj valuti kao hartija, sistem konvertuje iznos po
                trenutnom kursu uz dodatnu proviziju menjačnice.
              </p>
            )}
          </div>

          {submitError && <div className="co-banner co-banner--error">{submitError}</div>}

          <div className="co-actions">
            <button type="button" className="co-btn-secondary" onClick={() => navigate(-1)}>
              Otkaži
            </button>
            <button
              type="submit"
              className="co-btn-primary"
              disabled={submitting || settlementExpired}
            >
              Nastavi na potvrdu
            </button>
          </div>
        </form>
      </div>

      {showConfirm && (
        <div className="co-overlay" onClick={() => !submitting && setShowConfirm(false)}>
          <div className="co-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Potvrda naloga</h2>
            <dl className="co-confirm-list">
              <div><dt>Hartija</dt><dd>{security?.ticker} · {security?.name || ""}</dd></div>
              <div><dt>Smer</dt><dd>{directionLabel}</dd></div>
              <div><dt>Tip</dt><dd>{orderTypeLabel}</dd></div>
              <div><dt>Količina</dt><dd>{Number(quantity)}</dd></div>
              {contractSize > 1 && (
                <>
                  <div><dt>Veličina ugovora</dt><dd>{contractSize}</dd></div>
                  <div><dt>Broj jedinica</dt><dd>{Number(quantity) * contractSize}</dd></div>
                </>
              )}
              {showLimitField && (
                <div><dt>Limit</dt><dd>{formatCurrency(Number(limitPrice) || 0, securityCurrency)}</dd></div>
              )}
              {showStopField && (
                <div><dt>Stop</dt><dd>{formatCurrency(Number(stopPrice) || 0, securityCurrency)}</dd></div>
              )}
              <div><dt>Račun</dt><dd>{accountNumber || "—"}</dd></div>
              <div><dt>All or None</dt><dd>{allOrNone ? "Da" : "Ne"}</dd></div>
              <div><dt>Margin</dt><dd>{margin ? "Da" : "Ne"}</dd></div>
              <div><dt>Aproks. ukupno</dt><dd>{formatCurrency(approxTotalMajor, securityCurrency)}</dd></div>
              <div><dt>Provizija</dt><dd>{isEmployee ? "0" : formatCurrency(commissionMajor, securityCurrency)}</dd></div>
              <div><dt>Ukupno</dt><dd className="co-estimate-total">{formatCurrency(grandTotalMajor, securityCurrency)}</dd></div>
            </dl>
            <div className="co-modal-actions">
              <button className="co-btn-secondary" onClick={() => setShowConfirm(false)} disabled={submitting}>
                Odustani
              </button>
              <button className="co-btn-primary" onClick={handleConfirmContinue} disabled={submitting}>
                {submitting ? "Slanje..." : "Pošalji nalog"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
