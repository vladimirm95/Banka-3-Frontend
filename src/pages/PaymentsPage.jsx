import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
};

const FILTERS = [
    { key: "all",         label: "Sve",      match: null },
    { key: "Realizovano", label: "Izvršeno", match: "Realizovano" },
    { key: "Na čekanju",  label: "U obradi", match: "Na čekanju" },
    { key: "Odbijeno",    label: "Odbijeno", match: "Odbijeno" },
];

const BackArrow = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
    </svg>
);

const PrintIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </svg>
);

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

      <button className="pp-print-btn">
        🖨&nbsp; Štampaj potvrdu
      </button>
    </div>
  );
}

function PaymentList({ transactions, onSelect }) {
    const [filter, setFilter] = useState("all");

    const filtered = filter === "all"
        ? transactions
        : transactions.filter((t) => t.status === filter);

    const total    = filtered.reduce((s, t) => s + t.final_amount, 0);
    const currency = filtered[0]?.currency ?? "RSD";

    return (
        <div className="pp-content">
            <div className="pp-filters">
                {FILTERS.map((f) => {
                    const count  = f.match ? transactions.filter((t) => t.status === f.match).length : transactions.length;
                    const active = filter === f.key;
                    return (
                        <button
                            key={f.key}
                            className={`pp-filter-pill${active ? " pp-filter-pill--active" : ""}`}
                            onClick={() => setFilter(f.key)}
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

            {filtered.length === 0 ? (
                <div className="pp-empty">
                    <span className="pp-empty-icon">📋</span>
                    <span>Nema plaćanja u ovoj kategoriji</span>
                </div>
            ) : (
                <div className="pp-list">
                    {filtered.map((t, i) => {
                        const cfg = STATUS_CFG[t.status] ?? STATUS_CFG["Realizovano"];
                        return (
                            <button key={i} className="pp-row" onClick={() => onSelect(t)}>
                <span className="pp-row-icon" style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.icon}
                </span>
                                <div className="pp-row-mid">
                                    <span className="pp-row-account">{t.to_account}</span>
                                    <span className="pp-row-purpose">{t.purpose}</span>
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
                        <span className="pp-summary-label">Ukupno plaćanja</span>
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
  const [selectedTx, setSelectedTx]     = useState(null);
  const [loading, setLoading]           = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setTransactions(await getTransactions());
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="pp-bg">
      <img src="/bank-logo.png" alt="logo" className="pp-logo" />
      <Sidebar />

      <div className="pp-wrapper">
        {/* Page header */}
        <div className="pp-page-header">
          <div className="pp-title-row">
            <button className="pp-nav-back-btn" onClick={() => { setSelectedTx(null); navigate("/recipients"); }}>
              ‹
            </button>
            <h2 className="pp-page-title">
              {selectedTx ? "Detalji plaćanja" : "Pregled plaćanja"}
            </h2>
          </div>
          <button className="pp-new-btn" onClick={() => navigate("/payments/new")}>
            + Novo plaćanje
          </button>
        </div>

                <div className="pp-card">
                    {loading ? (
                        <div className="pp-loading">Učitavanje...</div>
                    ) : selectedTx ? (
                        <PaymentDetail tx={selectedTx} onBack={() => setSelectedTx(null)} />
                    ) : (
                        <PaymentList transactions={transactions} onSelect={setSelectedTx} />
                    )}
                </div>
            </div>
        </div>
    );
}