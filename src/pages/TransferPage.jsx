import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAccounts } from "../services/AccountService";
import { createTransfer } from "../services/PaymentService";
import Sidebar from "../components/Sidebar.jsx";
import TotpModal from "../components/TotpModal.jsx";
import useFailedAttempts, { BLOCKED_MESSAGE, MAX_FAILED_ATTEMPTS } from "../utils/useFailedAttempts";
import "./PaymentPage.css";

export default function TransferPage() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [totpError, setTotpError] = useState("");

  const { attempts, isBlocked, increment, reset } = useFailedAttempts("totp");

  useEffect(() => {
    getAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);

  function validate() {
    const errs = {};
    if (!fromAccount) errs.fromAccount = "Izaberite račun sa kog šaljete.";
    if (!toAccount) errs.toAccount = "Izaberite račun na koji šaljete.";
    if (fromAccount && toAccount && fromAccount === toAccount)
      errs.toAccount = "Ne možete preneti na isti račun.";
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      errs.amount = "Unesite ispravan iznos (veći od 0).";
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setSuccessMsg("");

    if (isBlocked) {
      setShowTotp(false);
      setSubmitError(BLOCKED_MESSAGE);
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setPendingPayload({
      from_account: fromAccount,
      to_account: toAccount,
      amount: Number(amount),
    });
    setTotpError("");
    setShowTotp(true);
  }

  async function handleTotpConfirm(code) {
    try {
      setSubmitting(true);
      setTotpError("");
      await createTransfer(pendingPayload, code);
      setShowTotp(false);
      setPendingPayload(null);
      setSuccessMsg("Prenos je uspešno izvršen.");
      setFromAccount("");
      setToAccount("");
      setAmount("");
      reset();
    } catch (err) {
      increment();
      const nextAttempts = attempts + 1;
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        setShowTotp(false);
        setSubmitError(BLOCKED_MESSAGE);
      } else {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Greška pri verifikaciji.";
        setTotpError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const selectStyle = {
    background: "#111827",
    border: "1px solid #1e293b",
    borderRadius: "10px",
    padding: "11px 14px",
    color: "#f1f5f9",
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.9rem",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div className="pay-shell">
      <Sidebar />
      <div className="pay-content">
        <div className="pay-header">
          <button className="pay-back-btn" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <p className="pay-subtitle">Interni prenos</p>
            <h1 className="pay-title">Prenos između računa</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="pay-section">
            <p className="pay-section-label">Sa računa</p>
            <div className="pay-field">
              <select
                style={selectStyle}
                value={fromAccount}
                onChange={(e) => {
                  setFromAccount(e.target.value);
                  if (errors.fromAccount) setErrors((prev) => ({ ...prev, fromAccount: "" }));
                }}
              >
                <option value="">-- Izaberite račun --</option>
                {accounts.map((acc) => (
                  <option key={acc.account_number} value={acc.account_number}>
                    {acc.account_number} ({acc.currency} - {acc.balance?.toLocaleString("sr-RS")})
                  </option>
                ))}
              </select>
              {errors.fromAccount && <p className="pay-error">{errors.fromAccount}</p>}
            </div>
          </div>

          <div className="pay-section">
            <p className="pay-section-label">Na račun</p>
            <div className="pay-field">
              <select
                style={selectStyle}
                value={toAccount}
                onChange={(e) => {
                  setToAccount(e.target.value);
                  if (errors.toAccount) setErrors((prev) => ({ ...prev, toAccount: "" }));
                }}
              >
                <option value="">-- Izaberite račun --</option>
                {accounts
                  .filter((acc) => acc.account_number !== fromAccount)
                  .map((acc) => (
                    <option key={acc.account_number} value={acc.account_number}>
                      {acc.account_number} ({acc.currency} - {acc.balance?.toLocaleString("sr-RS")})
                    </option>
                  ))}
              </select>
              {errors.toAccount && <p className="pay-error">{errors.toAccount}</p>}
            </div>
          </div>

          <div className="pay-section">
            <p className="pay-section-label">Iznos</p>
            <div className="pay-field">
              <input
                className={`pay-input ${errors.amount ? "pay-input--error" : ""}`}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
                }}
                placeholder="0.00"
              />
              {errors.amount && <p className="pay-error">{errors.amount}</p>}
            </div>
          </div>

          {fromAccount && toAccount && amount && Number(amount) > 0 && (
            <div className="pay-summary">
              <p className="pay-summary-label">Pregled prenosa</p>
              <div className="pay-summary-row">
                <span>Sa računa</span>
                <span>{fromAccount}</span>
              </div>
              <div className="pay-summary-row">
                <span>Na račun</span>
                <span>{toAccount}</span>
              </div>
              <div className="pay-summary-row">
                <span>Iznos</span>
                  <span>
                {new Intl.NumberFormat("sr-RS", {
                     minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(Number(amount))}{" "}
                      {accounts.find((acc) => acc.account_number === fromAccount)?.currency || ""}
                </span>
              </div>
            </div>
          )}

          {successMsg && <p className="pay-success">{successMsg}</p>}
          {submitError && <p className="pay-error pay-error--submit">{submitError}</p>}
          {isBlocked && !submitError && (
            <p className="pay-error pay-error--submit">{BLOCKED_MESSAGE}</p>
          )}

          <div className="pay-actions">
            <button type="button" className="pay-btn-back" onClick={() => navigate(-1)}>
              Otkaži
            </button>
            <button type="submit" className="pay-btn-submit" disabled={submitting || isBlocked}>
              {submitting ? "Slanje..." : "Izvrši prenos"}
            </button>
          </div>
        </form>

        {showTotp && (
          <TotpModal
            onConfirm={handleTotpConfirm}
            onCancel={() => { setShowTotp(false); setTotpError(""); }}
            loading={submitting}
            error={totpError}
          />
        )}
      </div>
    </div>
  );
}
