import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getAccountByNumber,
  getAccounts,
  renameAccount,
  updateAccountLimits,
} from "../services/AccountService";
import { getUserCards, formatCardNumber } from "../services/CardService"; // Dodat import za kartice
import Sidebar from "../components/Sidebar.jsx";
import "./AdminAccountDetailsPage.css";

function fmt(amount, currency = "RSD") {
  if (amount == null) return "—";
  return (
      new Intl.NumberFormat("sr-RS", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) +
      " " +
      currency
  );
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("sr-RS");
}

function InfoRow({ label, value }) {
  return (
      <div className="aad-info-row">
        <span className="aad-info-label">{label}</span>
        <span className="aad-info-value">{value ?? "—"}</span>
      </div>
  );
}

function isBusinessAccount(account) {
  const type = String(account?.account_type || "").toLowerCase();
  return (
      type.includes("business") ||
      type.includes("poslov") ||
      Boolean(account?.company_name)
  );
}

export default function AdminAccountDetailsPage() {
  const { accountNumber } = useParams();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [cards, setCards] = useState([]); // State za kartice povezane sa računom
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Rename state
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  // Limit state
  const [isLimitOpen, setIsLimitOpen] = useState(false);
  const [newDailyLimit, setNewDailyLimit] = useState("");
  const [newMonthlyLimit, setNewMonthlyLimit] = useState("");
  const [limitError, setLimitError] = useState("");
  const [limitLoading, setLimitLoading] = useState(false);

  useEffect(() => {
    if (!accountNumber) return;
    let cancelled = false;

    async function load() {
      try {
        const [data, accountsData, cardsData] = await Promise.all([
          getAccountByNumber(accountNumber),
          getAccounts().catch(() => []),
          getUserCards().catch(() => []), // Povlačimo sve kartice korisnika
        ]);
        if (!cancelled) {
          setAccount(data);
          setAllAccounts(Array.isArray(accountsData) ? accountsData : []);

          // Filtriramo kartice tako da ostanu samo one vezane za ovaj broj računa
          const filteredCards = cardsData.filter(c => c.accountNumber === accountNumber);
          setCards(filteredCards);

          setNewAccountName(data?.account_name || "");
        }
      } catch {
        if (!cancelled) setError("Greška pri učitavanju podataka o računu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [accountNumber]);

  const reserved = useMemo(() => {
    const bal = Number(account?.balance || 0);
    const avail = Number(account?.available_balance ?? account?.balance ?? 0);
    const r = bal - avail;
    return r > 0 ? r : 0;
  }, [account]);

  const dailyPct = account?.daily_limit
      ? Math.min((account.daily_spending / account.daily_limit) * 100, 100)
      : 0;
  const monthlyPct = account?.monthly_limit
      ? Math.min((account.monthly_spending / account.monthly_limit) * 100, 100)
      : 0;

  // ── Rename handlers ──
  const handleOpenRename = () => {
    setRenameError("");
    setNewAccountName(account?.account_name || "");
    setIsRenameOpen(true);
  };

  const handleCloseRename = () => {
    setIsRenameOpen(false);
    setRenameError("");
    setNewAccountName(account?.account_name || "");
  };

  const handleRenameSubmit = async () => {
    const trimmed = newAccountName.trim();
    if (!trimmed) {
      setRenameError("Novo ime računa je obavezno.");
      return;
    }
    if (trimmed === (account?.account_name || "").trim()) {
      setRenameError("Novo ime računa mora biti drugačije od trenutnog.");
      return;
    }

    const duplicateName = allAccounts.some((acc) => {
      if (!acc || acc.account_number === account?.account_number) return false;
      const sameOwner = String(acc.owner_id ?? "") === String(account?.owner_id ?? "");
      return sameOwner && String(acc.account_name || "").trim().toLowerCase() === trimmed.toLowerCase();
    });

    if (duplicateName) {
      setRenameError("Već postoji račun sa tim nazivom kod istog klijenta.");
      return;
    }

    try {
      setRenameLoading(true);
      setRenameError("");
      const updated = await renameAccount(account.account_number, trimmed);
      setAccount((prev) => ({
        ...prev,
        ...(updated && typeof updated === "object" ? updated : {}),
        account_name: trimmed,
      }));
      setAllAccounts((prev) =>
          prev.map((acc) =>
              acc.account_number === account.account_number
                  ? { ...acc, account_name: trimmed }
                  : acc
          )
      );
      setIsRenameOpen(false);
    } catch (err) {
      console.error("Greška pri promeni naziva:", err);
      setRenameError("Promena naziva računa nije uspela.");
    } finally {
      setRenameLoading(false);
    }
  };

  // ── Limit handlers ──
  const handleOpenLimit = () => {
    setLimitError("");
    setNewDailyLimit(account?.daily_limit != null ? String(account.daily_limit) : "0");
    setNewMonthlyLimit(account?.monthly_limit != null ? String(account.monthly_limit) : "0");
    setIsLimitOpen(true);
  };

  const handleCloseLimit = () => {
    setIsLimitOpen(false);
    setLimitError("");
  };

  const handleLimitSubmit = async () => {
    const daily = Number(newDailyLimit);
    const monthly = Number(newMonthlyLimit);

    if (Number.isNaN(daily) || daily < 0) {
      setLimitError("Dnevni limit mora biti pozitivan broj.");
      return;
    }
    if (Number.isNaN(monthly) || monthly < 0) {
      setLimitError("Mesečni limit mora biti pozitivan broj.");
      return;
    }

    try {
      setLimitLoading(true);
      setLimitError("");
      const updated = await updateAccountLimits(account.account_number, daily, monthly);
      setAccount((prev) => ({
        ...prev,
        ...(updated && typeof updated === "object" ? updated : {}),
        daily_limit: daily,
        monthly_limit: monthly,
      }));
      setIsLimitOpen(false);
    } catch (err) {
      console.error("Greška pri promeni limita:", err);
      setLimitError("Promena limita nije uspela.");
    } finally {
      setLimitLoading(false);
    }
  };

  if (loading) {
    return (
        <div className="aad-shell">
          <p className="aad-state-msg">Učitavanje...</p>
        </div>
    );
  }

  if (error || !account) {
    return (
        <div className="aad-shell">
          <p className="aad-state-msg aad-state-msg--error">{error || "Račun nije pronađen."}</p>
        </div>
    );
  }

  const isBusiness = isBusinessAccount(account);

  return (
      <div className="aad-shell">
        <div className="aad-content">
          <Sidebar />

          {/* Header */}
          <div className="aad-header">
            <button className="aad-back-btn" onClick={() => navigate("/admin/accounts")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="aad-title-block">
              <p>Detalji računa</p>
              <h1>{account.account_name}</h1>
            </div>
            <span className={`aad-status-badge ${account.status === "Aktivan" ? "aad-status-badge--active" : "aad-status-badge--inactive"}`}>
            {account.status}
          </span>
          </div>

          {/* Balance */}
          <div className="aad-balance-card">
            <p className="aad-account-number">{account.account_number}</p>
            <p className="aad-balance-main">{fmt(account.balance, account.currency)}</p>
            <div className="aad-balance-row">
              <div>
                <p className="aad-balance-label">Raspoloživo</p>
                <p className="aad-balance-available">{fmt(account.available_balance, account.currency)}</p>
              </div>
              <div>
                <p className="aad-balance-label">Rezervisano</p>
                <p className="aad-balance-reserved">{fmt(reserved, account.currency)}</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="aad-section">
            <p className="aad-section-title">Informacije o računu</p>
            <div className="aad-info-grid">
              <InfoRow label="Tip računa" value={account.account_type} />
              <InfoRow label="Valuta" value={account.currency} />
              <InfoRow label="ID Klijenta" value={account.owner_id} />
              <InfoRow label="ID Zaposlenog" value={account.employee_id} />
              <InfoRow label="Datum otvaranja" value={fmtDate(account.creation_date)} />
              <InfoRow label="Datum isteka" value={fmtDate(account.expiration_date)} />
              {isBusiness && (
                  <InfoRow
                      label="Firma"
                      value={account.company_name || account.business_name || account.firm_name || "—"}
                  />
              )}
            </div>

            <div className="aad-actions">
              <button className="aad-action-btn" type="button" onClick={handleOpenRename}>
                Promena naziva
              </button>
              <button className="aad-action-btn" type="button" onClick={handleOpenLimit}>
                Promena limita
              </button>
            </div>
          </div>

          {/* --- NOVI ODELJAK ZA KARTICE --- */}
          <div className="aad-section">
            <p className="aad-section-title">Povezane kartice ({cards.length})</p>
            <div className="aad-cards-container">
              {cards.length === 0 ? (
                  <p className="aad-no-data">Nema izdatih kartica za ovaj račun.</p>
              ) : (
                  <div className="aad-cards-list">
                    {cards.map((card) => (
                        <div key={card.id} className="aad-card-item">
                          <div className="aad-card-icon-box">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                              <line x1="1" y1="10" x2="23" y2="10"></line>
                            </svg>
                          </div>
                          <div className="aad-card-details">
                            <p className="aad-card-name-text">{card.cardName || "Debitna kartica"}</p>
                            <p className="aad-card-number-text">{formatCardNumber(card.cardNumber)}</p>
                          </div>
                          <div className="aad-card-meta">
                            <p className="aad-card-type-label">{card.cardType.toUpperCase()}</p>
                            <p className={`aad-card-status-label ${card.status === "Aktivna" ? "status--active" : "status--blocked"}`}>
                              {card.status}
                            </p>
                          </div>
                          <div className="aad-card-expiry-box">
                            <span className="aad-card-expiry-label">Ističe:</span>
                            <span className="aad-card-expiry-date">{card.expiryDate}</span>
                          </div>
                        </div>
                    ))}
                  </div>
              )}
            </div>
          </div>

          {/* Limits */}
          <div className="aad-section">
            <p className="aad-section-title">Limiti i potrošnja</p>
            <div className="aad-info-grid">
              <InfoRow label="Dnevni limit" value={fmt(account.daily_limit, account.currency)} />
              <InfoRow label="Mesečni limit" value={fmt(account.monthly_limit, account.currency)} />
              <InfoRow label="Dnevna potrošnja" value={fmt(account.daily_spending, account.currency)} />
              <InfoRow label="Mesečna potrošnja" value={fmt(account.monthly_spending, account.currency)} />
            </div>

            <div className="aad-limit-bars">
              <div className="aad-limit-bar-wrapper">
                <div className="aad-limit-bar-label">
                  <span>Dnevna potrošnja</span>
                  <span>{fmt(account.daily_spending, account.currency)} / {fmt(account.daily_limit, account.currency)}</span>
                </div>
                <div className="aad-limit-bar-track">
                  <div className="aad-limit-bar-fill" style={{ width: `${dailyPct}%` }} />
                </div>
              </div>

              <div className="aad-limit-bar-wrapper">
                <div className="aad-limit-bar-label">
                  <span>Mesečna potrošnja</span>
                  <span>{fmt(account.monthly_spending, account.currency)} / {fmt(account.monthly_limit, account.currency)}</span>
                </div>
                <div className="aad-limit-bar-track">
                  <div className="aad-limit-bar-fill" style={{ width: `${monthlyPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Modals... */}
          {isRenameOpen && (
              <div className="aad-modal-overlay" onClick={handleCloseRename}>
                <div className="aad-modal" onClick={(e) => e.stopPropagation()}>
                  <h3 className="aad-modal-title">Promena naziva računa</h3>
                  <p className="aad-modal-current">
                    Trenutni naziv: <strong>{account.account_name || "—"}</strong>
                  </p>
                  <label className="aad-modal-label" htmlFor="aadNewName">
                    Novo ime računa
                  </label>
                  <input
                      id="aadNewName"
                      className="aad-modal-input"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Unesi novo ime računa"
                  />
                  {renameError && <p className="aad-modal-error">{renameError}</p>}
                  <div className="aad-modal-actions">
                    <button
                        className="aad-action-btn aad-action-btn--secondary"
                        type="button"
                        onClick={handleCloseRename}
                        disabled={renameLoading}
                    >
                      Otkaži
                    </button>
                    <button
                        className="aad-action-btn"
                        type="button"
                        onClick={handleRenameSubmit}
                        disabled={renameLoading}
                    >
                      {renameLoading ? "Čuvanje..." : "Sačuvaj"}
                    </button>
                  </div>
                </div>
              </div>
          )}

          {isLimitOpen && (
              <div className="aad-modal-overlay" onClick={handleCloseLimit}>
                <div className="aad-modal" onClick={(e) => e.stopPropagation()}>
                  <h3 className="aad-modal-title">Promena limita</h3>
                  <label className="aad-modal-label" htmlFor="aadDailyLimit">
                    Dnevni limit ({account.currency})
                  </label>
                  <input
                      id="aadDailyLimit"
                      className="aad-modal-input"
                      type="number"
                      min="0"
                      value={newDailyLimit}
                      onChange={(e) => setNewDailyLimit(e.target.value)}
                      placeholder="0 = bez limita"
                  />
                  <label className="aad-modal-label" htmlFor="aadMonthlyLimit">
                    Mesečni limit ({account.currency})
                  </label>
                  <input
                      id="aadMonthlyLimit"
                      className="aad-modal-input"
                      type="number"
                      min="0"
                      value={newMonthlyLimit}
                      onChange={(e) => setNewMonthlyLimit(e.target.value)}
                      placeholder="0 = bez limita"
                  />
                  {limitError && <p className="aad-modal-error">{limitError}</p>}
                  <div className="aad-modal-actions">
                    <button
                        className="aad-action-btn aad-action-btn--secondary"
                        type="button"
                        onClick={handleCloseLimit}
                        disabled={limitLoading}
                    >
                      Otkaži
                    </button>
                    <button
                        className="aad-action-btn"
                        type="button"
                        onClick={handleLimitSubmit}
                        disabled={limitLoading}
                    >
                      {limitLoading ? "Čuvanje..." : "Sačuvaj"}
                    </button>
                  </div>
                </div>
              </div>
          )}
        </div>
      </div>
  );
}
