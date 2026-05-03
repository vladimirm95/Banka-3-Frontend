import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getExchanges, setExchangeOpenOverride } from "../services/ExchangeService";
import Sidebar from "../components/Sidebar.jsx";
import "./BerzaPage.css";

export default function BerzaPage() {
    const navigate = useNavigate();
    const [exchanges, setExchanges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await getExchanges();
                if (!cancelled) {
                    setExchanges(Array.isArray(data) ? data : []);
                    setError("");
                }
            } catch {
                if (!cancelled) {
                    setError("Greška pri učitavanju podataka o berzama.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const handleToggleOverride = async (exchange) => {
        const next = !exchange.open_override;
        setUpdatingId(exchange.id);
        try {
            const updated = await setExchangeOpenOverride(exchange.id, next);
            setExchanges((prev) =>
                prev.map((ex) => (ex.id === exchange.id ? { ...ex, ...updated } : ex))
            );
            setSuccess(
                `${exchange.name || exchange.acronym} je ${next ? "prinudno otvorena" : "vraćena na redovno radno vreme"}.`
            );
            setError("");
            setTimeout(() => setSuccess(""), 3000);
        } catch {
            setError("Greška pri izmeni statusa berze.");
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className="berza-page">
                <div className="berza-content">
                    <Sidebar />
                    <div className="berza-header">
                        <button className="berza-back-btn" onClick={() => navigate("/dashboard")}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        <h1 className="berza-title">Berze</h1>
                    </div>
                    <p className="berza-loading">Učitavanje...</p>
                </div>
            </div>
        );
    }

    if (error && !exchanges.length) {
        return (
            <div className="berza-page">
                <div className="berza-content">
                    <Sidebar />
                    <div className="berza-header">
                        <button className="berza-back-btn" onClick={() => navigate("/dashboard")}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        <h1 className="berza-title">Berze</h1>
                    </div>
                    <p className="berza-error">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="berza-page">
            <div className="berza-content">
                <Sidebar />

                <div className="berza-header">
                    <button className="berza-back-btn" onClick={() => navigate("/employees")}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <h1 className="berza-title">Berze</h1>
                </div>

                {success && <p className="berza-msg berza-msg--success">{success}</p>}
                {error && <p className="berza-msg berza-msg--error">{error}</p>}

                <div className="berza-list">
                    {exchanges.map((exchange) => (
                        <div key={exchange.id} className="berza-card">
                            <div className="berza-card-header">
                                <h2 className="berza-exchange-name">
                                    {exchange.name}
                                    {exchange.acronym ? ` (${exchange.acronym})` : ""}
                                </h2>
                                <div className={`berza-status ${exchange.open_override ? "berza-status--open" : "berza-status--closed"}`}>
                                    {exchange.open_override ? "Override: ON" : "Override: OFF"}
                                </div>
                            </div>

                            <div className="berza-card-info">
                                <div className="berza-info-item">
                                    <label className="berza-info-label">MIC kod:</label>
                                    <span className="berza-info-value">{exchange.mic_code || "—"}</span>
                                </div>
                                <div className="berza-info-item">
                                    <label className="berza-info-label">Valuta:</label>
                                    <span className="berza-info-value">{exchange.currency || "—"}</span>
                                </div>
                                <div className="berza-info-item">
                                    <label className="berza-info-label">Vremenska zona:</label>
                                    <span className="berza-info-value">{exchange.time_zone_offset || "—"}</span>
                                </div>
                                <div className="berza-info-item">
                                    <label className="berza-info-label">Radno vreme:</label>
                                    <span className="berza-info-value">
                                        {exchange.open_time || "—"} – {exchange.close_time || "—"}
                                    </span>
                                </div>
                            </div>

                            <div className="berza-card-toggle">
                                <label className="berza-toggle-label">Override (testiranje):</label>
                                <button
                                    className={`berza-toggle-btn ${exchange.open_override ? "berza-toggle-btn--open" : ""}`}
                                    onClick={() => handleToggleOverride(exchange)}
                                    disabled={updatingId === exchange.id}
                                    title={`Klikni da ${exchange.open_override ? "isključiš" : "uključiš"} prinudno otvaranje`}
                                >
                                    <span className="berza-toggle-circle"></span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
