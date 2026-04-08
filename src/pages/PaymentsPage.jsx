import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTransactions } from "../services/PaymentService";
import Sidebar from "../components/Sidebar.jsx";
import "./PaymentsPage.css";

function fmt(amount, currency = "RSD") {
    return `${Math.abs(amount).toLocaleString("sr-RS")} ${currency}`;
}

function formatDate(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleString("sr-RS", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildPaymentReceiptHtml(tx, statusLabel) {
    const amount = fmt(tx.final_amount, tx.currency);
    const fee = tx.fee > 0 ? fmt(tx.fee, tx.currency) : "0,00 " + (tx.currency || "RSD");
    const formattedDate = formatDate(tx.timestamp);

    return `
    <!DOCTYPE html>
    <html lang="sr">
      <head>
        <meta charset="UTF-8" />
        <title>Potvrda o plaćanju</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 32px;
            font-family: Arial, Helvetica, sans-serif;
            background: #ffffff;
            color: #111827;
          }

          .receipt {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #d1d5db;
            border-radius: 16px;
            overflow: hidden;
          }

          .receipt-header {
            padding: 24px 28px;
            background: #0f172a;
            color: #f8fafc;
          }

          .receipt-header h1 {
            margin: 0 0 6px;
            font-size: 28px;
            line-height: 1.2;
          }

          .receipt-header p {
            margin: 0;
            font-size: 14px;
            color: #cbd5e1;
          }

          .receipt-amount {
            padding: 24px 28px 12px;
            border-bottom: 1px solid #e5e7eb;
          }

          .receipt-amount-label {
            display: block;
            font-size: 12px;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 8px;
            letter-spacing: 0.08em;
            font-weight: 700;
          }

          .receipt-amount-value {
            display: block;
            font-size: 34px;
            font-weight: 800;
            color: #111827;
          }

          .receipt-section {
            padding: 16px 28px 24px;
          }

          .receipt-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px 18px;
          }

          .receipt-item {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 14px 16px;
            min-height: 74px;
          }

          .receipt-label {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 6px;
            letter-spacing: 0.08em;
            font-weight: 700;
          }

          .receipt-value {
            display: block;
            font-size: 14px;
            color: #111827;
            font-weight: 600;
            word-break: break-word;
          }

          .receipt-footer {
            padding: 18px 28px 26px;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
          }

          @media print {
            body {
              padding: 0;
            }

            .receipt {
              border: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="receipt-header">
            <h1>Potvrda o plaćanju</h1>
            <p>Pregled detalja izabrane transakcije</p>
          </div>

          <div class="receipt-amount">
            <span class="receipt-amount-label">Ukupan iznos</span>
            <span class="receipt-amount-value">${escapeHtml(amount)}</span>
          </div>

          <div class="receipt-section">
            <div class="receipt-grid">
              <div class="receipt-item">
                <span class="receipt-label">Račun primaoca</span>
                <span class="receipt-value">${escapeHtml(tx.to_account)}</span>
              </div>

              <div class="receipt-item">
                <span class="receipt-label">Račun platioca</span>
                <span class="receipt-value">${escapeHtml(tx.from_account)}</span>
              </div>

              <div class="receipt-item">
                <span class="receipt-label">Svrha plaćanja</span>
                <span class="receipt-value">${escapeHtml(tx.purpose)}</span>
              </div>

              <div class="receipt-item">
                <span class="receipt-label">Status</span>
                <span class="receipt-value">${escapeHtml(statusLabel)}</span>
              </div>

              <div class="receipt-item">
                <span class="receipt-label">Šifra plaćanja</span>
                <span class="receipt-value">${escapeHtml(tx.payment_code)}</span>
              </div>

              <div class="receipt-item">
                <span class="receipt-label">Poziv na broj</span>
                <span class="receipt-value">${escapeHtml(tx.reference_number)}</span>
              </div>

              <div class="receipt-item">
                <span class="receipt-label">Naknada</span>
                <span class="receipt-value">${escapeHtml(fee)}</span>
              </div>

              <div class="receipt-item">
                <span class="receipt-label">Datum i vreme</span>
                <span class="receipt-value">${escapeHtml(formattedDate)}</span>
              </div>
            </div>
          </div>

          <div class="receipt-footer">
            Ova potvrda je generisana iz aplikacije za pregled plaćanja.
          </div>
        </div>
      </body>
    </html>
  `;
}

function handlePrintPaymentReceipt(tx, statusLabel) {
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
        window.alert("Pregledač je blokirao otvaranje prozora za štampu.");
        return;
    }

    const html = buildPaymentReceiptHtml(tx, statusLabel);

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.focus();

    const triggerPrint = () => {
        printWindow.print();
    };

    if (printWindow.document.readyState === "complete") {
        setTimeout(triggerPrint, 150);
    } else {
        printWindow.onload = () => setTimeout(triggerPrint, 150);
    }
}


// backend vraća engleski, mi prikazujemo srpski
const STATUS_MAP = {
  'realized': 'Realizovano',
  'pending': 'Na čekanju',
  'rejected': 'Odbijeno',
  'approved': 'Odobreno',
};

const STATUS_CFG = {
    Realizovano:  { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "Izvršeno", icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        )},
    "Na čekanju": { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", label: "U obradi", icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        )},
    Odbijeno:     { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "Odbijeno", icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        )},
    Odobreno: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "Odobreno", icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        )},
};

const FILTERS = [
    { key: "all",         label: "Sve",       match: null },
    { key: "Realizovano", label: "Izvršeno",  match: "Realizovano" },
    { key: "Na čekanju",  label: "U obradi",  match: "Na čekanju" },
    { key: "Odbijeno",    label: "Odbijeno",  match: "Odbijeno" },
    { key: "Odobreno", label: "Odobreno", match: "Odobreno" },
];


// ─── Payment detail ──────────────────────────────────────────
function PaymentDetail({ tx, onBack }) {
  const cfg = STATUS_CFG[tx.status] ?? STATUS_CFG["Realizovano"];

  return (
    <div className="pp-content">
        <Sidebar/>
      <div className="pp-top-row">
        <button className="pp-back-btn" onClick={onBack}>‹</button>
        <span className="pp-section-title">Detalji plaćanja</span>
      </div>

      {/* Status banner */}
      <div className="pp-status-banner" style={{ background: cfg.bg, borderColor: cfg.color + "33" }}>
        <span className="pp-status-icon" style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className="pp-status-label" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>

      {/* Amount */}
      <div className="pp-amount-card">
        <span className="pp-amount-sup">Iznos</span>
        <span className="pp-amount-val">{fmt(tx.final_amount, tx.currency)}</span>
        {tx.fee > 0 && <span className="pp-fee">+ {fmt(tx.fee, tx.currency)} naknada</span>}
      </div>

      {/* Detail rows */}
      <div className="pp-detail-card">
        {[
          ["Račun primaoca", tx.to_account],
          ["Račun platioca", tx.from_account],
          ["Svrha plaćanja", tx.purpose],
          ["Šifra plaćanja", tx.payment_code],
          ["Poziv na broj",  tx.reference_number],
          ["Datum i vreme",  formatDate(tx.timestamp)],
          ["Status",         cfg.label],
        ].map(([label, value], i) => (
          <div key={label} className={`pp-drow${i > 0 ? " pp-drow--border" : ""}`}>
            <span className="pp-drow-label">{label}</span>
            <span className="pp-drow-value">{value}</span>
          </div>
        ))}
      </div>

        <button
            className="pp-print-btn"
            onClick={() => handlePrintPaymentReceipt(tx, cfg.label)}
        >
            🖨&nbsp; Štampaj potvrdu
        </button>
    </div>
  );
}

function PaymentList({ transactions, onSelect, onFilterChange, statusFilter }) {
    const [typeFilter, setTypeFilter] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [amountMin, setAmountMin] = useState("");
    const [amountMax, setAmountMax] = useState("");

    const getTransactionType = (tx) => {
        return tx.payment_code ? "payment" : "transfer";
    };

    const filtered = transactions.filter((t) => {
        if (statusFilter !== "all" && t.status !== statusFilter) {
          return false;
        }

        if (typeFilter !== "all") {
            const txType = getTransactionType(t);
            if (typeFilter === "payment" && txType !== "payment") return false;
            if (typeFilter === "transfer" && txType !== "transfer") return false;
        }

        if (dateFrom || dateTo) {
            const txDate = new Date(t.timestamp).toISOString().split('T')[0];
            if (dateFrom && txDate < dateFrom) return false;
            if (dateTo && txDate > dateTo) return false;
        }

        if (amountMin !== "" && t.final_amount < parseFloat(amountMin)) return false;
        if (amountMax !== "" && t.final_amount > parseFloat(amountMax)) return false;

        return true;
    });

    const handleStatusFilterChange = (newStatus) => {
        console.log("📌 Kliknuo na filter:", newStatus);
        onFilterChange({
            status: newStatus !== "all" ? newStatus : "",
        });
    };

    const total = filtered.reduce((s, t) => s + t.final_amount, 0);
    const currency = filtered[0]?.currency ?? "RSD";

    return (
        <div className="pp-content">
            <div className="pp-filters">
                {FILTERS.map((f) => {
                    let count = 0;
                    if (f.key === "all") {
                        count = transactions.length;
                    } else if (f.match) {
                        count = transactions.filter((t) => t.status === f.match).length;
                    }
                    
                    const active = statusFilter === f.key;
                    
                    return (
                        <button
                            key={f.key}
                            className={`pp-filter-pill${active ? " pp-filter-pill--active" : ""}`}
                            onClick={() => handleStatusFilterChange(f.key)}
                        >
                            {f.label}
                            {f.match && (
                                <span className={`pp-pill-count${active ? " pp-pill-count--active" : ""}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="pp-filters">
                <button
                    className={`pp-filter-pill${typeFilter === "all" ? " pp-filter-pill--active" : ""}`}
                    onClick={() => setTypeFilter("all")}
                >
                    Sve transakcije ({transactions.length})
                </button>
                <button
                    className={`pp-filter-pill${typeFilter === "payment" ? " pp-filter-pill--active" : ""}`}
                    onClick={() => setTypeFilter("payment")}
                >
                    Plaćanja ({transactions.filter(t => getTransactionType(t) === "payment").length})
                </button>
                <button
                    className={`pp-filter-pill${typeFilter === "transfer" ? " pp-filter-pill--active" : ""}`}
                    onClick={() => setTypeFilter("transfer")}
                >
                    Prenosi ({transactions.filter(t => getTransactionType(t) === "transfer").length})
                </button>
            </div>

            <div className="pp-advanced-filters">
                <div className="pp-filter-row">
                    <div className="pp-filter-group">
                        <label>Od datuma</label>
                        <input 
                            type="date" 
                            value={dateFrom} 
                            onChange={(e) => setDateFrom(e.target.value)} 
                        />
                    </div>
                    <div className="pp-filter-group">
                        <label>Do datuma</label>
                        <input 
                            type="date" 
                            value={dateTo} 
                            onChange={(e) => setDateTo(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="pp-filter-row">
                    <div className="pp-filter-group">
                        <label>Minimalni iznos</label>
                        <input 
                            type="number" 
                            placeholder="0.00" 
                            value={amountMin} 
                            onChange={(e) => setAmountMin(e.target.value)} 
                        />
                    </div>
                    <div className="pp-filter-group">
                        <label>Maksimalni iznos</label>
                        <input 
                            type="number" 
                            placeholder="0.00" 
                            value={amountMax} 
                            onChange={(e) => setAmountMax(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="pp-filter-actions">
                    <button 
                        className="pp-filter-reset" 
                        onClick={() => {
                            setTypeFilter("all");
                            setDateFrom("");
                            setDateTo("");
                            setAmountMin("");
                            setAmountMax("");
                            onFilterChange({ status: "" });
                        }}
                    >
                        Resetuj sve filtere
                    </button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="pp-empty">
                    <span className="pp-empty-icon">📋</span>
                    <span>Nema transakcija sa izabranim filterima</span>
                </div>
            ) : (
                <div className="pp-list">
                    {filtered.map((t, i) => {
                        const cfg = STATUS_CFG[t.status] ?? STATUS_CFG["Realizovano"];
                        const txType = getTransactionType(t);
                        return (
                            <button key={i} className="pp-row" onClick={() => onSelect(t)}>
                                <span className="pp-row-icon" style={{ background: cfg.bg, color: cfg.color }}>
                                    {cfg.icon}
                                </span>
                                <div className="pp-row-mid">
                                    <span className="pp-row-account">{t.to_account}</span>
                                    <span className="pp-row-purpose">{t.purpose || (txType === "transfer" ? "Interni prenos" : "Plaćanje")}</span>
                                    <span className="pp-row-date">{formatDate(t.timestamp)}</span>
                                </div>
                                <div className="pp-row-right">
                                    <span className="pp-row-amount">{fmt(t.final_amount, t.currency)}</span>
                                    <span className="pp-row-badge" style={{ background: cfg.bg, color: cfg.color }}>
                                        {cfg.label}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {filtered.length > 0 && (
                <div className="pp-summary">
                    <div className="pp-summary-row">
                        <span className="pp-summary-label">Ukupno rezultata</span>
                        <span className="pp-summary-value">{filtered.length}</span>
                    </div>
                    <div className="pp-summary-row pp-summary-row--border">
                        <span className="pp-summary-label">Ukupan iznos</span>
                        <span className="pp-summary-value">{fmt(total, currency)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();
  const location = useLocation();

  const backTarget =
      location.state?.from === "recipients" ? "/recipients" : "/dashboard";

  async function loadTransactions(filters = {}) {
    setLoading(true);
    try {
      const data = await getTransactions(filters);
      console.log("✅ loadTransactions() - Učitane transakcije sa filterima:", filters);
      setTransactions(data);
    } catch (error) {
      console.error("❌ Greška pri učitavanju:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleFilterChange = (filters) => {
    // Ažuriraj status filter state
    if (filters.status === "") {
      setStatusFilter("all");
    } else if (filters.status) {
      setStatusFilter(filters.status);
    }
    loadTransactions(filters);
  };

  return (
    <div className="pp-bg">
      <img src="/bank-logo.png" alt="logo" className="pp-logo" />
      <Sidebar />

      <div className="pp-wrapper">
        <div className="pp-page-header">
          <div className="pp-title-row">
              <button
                  className="pp-nav-back-btn"
                  onClick={() => {
                      setSelectedTx(null);
                      navigate(backTarget);
                  }}
              >
                  ‹
              </button>
            <h2 className="pp-page-title">
              {selectedTx ? "Detalji plaćanja" : "Pregled plaćanja"}
            </h2>
          </div>
          <button className="pp-new-btn" onClick={() => navigate("/payment")}>
            + Novo plaćanje
          </button>
        </div>

        <div className="pp-card">
            {loading ? (
                <div className="pp-loading">Učitavanje...</div>
            ) : selectedTx ? (
                <PaymentDetail tx={selectedTx} onBack={() => setSelectedTx(null)} />
            ) : (
                <PaymentList 
                    transactions={transactions} 
                    onSelect={setSelectedTx}
                    onFilterChange={handleFilterChange}
                    statusFilter={statusFilter}
                />
            )}
        </div>
      </div>
    </div>
  );
}