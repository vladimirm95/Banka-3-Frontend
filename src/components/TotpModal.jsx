import { useState, useEffect, useRef } from "react";
import "./TotpModal.css";

export default function TotpModal({ open, onConfirm, onCancel, loading, error }) {
  const [code, setCode] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  function handleChange(e) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(val);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (code.length === 6 && !loading) {
      onConfirm(code);
    }
  }

  return (
    <div className="totp-overlay" onClick={onCancel}>
      <div className="totp-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="totp-title">Verifikacija</h2>
        <p className="totp-subtitle">
          Unesite 6-cifreni kod iz autentifikator aplikacije.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className={`totp-input ${error ? "totp-input--error" : ""}`}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={handleChange}
            placeholder="000000"
            autoComplete="one-time-code"
          />
          {error && <p className="totp-error">{error}</p>}
          <div className="totp-actions">
            <button type="button" className="totp-btn-cancel" onClick={onCancel} disabled={loading}>
              Otkaži
            </button>
            <button type="submit" className="totp-btn-confirm" disabled={code.length < 6 || loading}>
              {loading ? "Provera..." : "Potvrdi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
