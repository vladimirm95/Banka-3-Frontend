import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getExchangeRates, updateExchangeStatus } from "../services/ExchangeService";
import Sidebar from "../components/Sidebar.jsx";
import "./BerzaPage.css";

export default function BerzaPage() {
    const navigate = useNavigate();
    const [exchanges, setExchanges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await getExchangeRates();
                if (!cancelled) {
                    setExchanges(data);
                    setError("");
                }
            } catch {
                if (!cancelled) {
                    setError("Greška pri učitavanju podataka o burzama.");
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

    const handleToggleStatus = async (exchangeId, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            await updateExchangeStatus(exchangeId, newStatus);
            
            const updatedExchanges = exchanges.map(ex =>
                ex.id === exchangeId ? { ...ex, isOpen: newStatus } : ex
            );
            setExchanges(updatedExchanges);
            
            const exchange = updatedExchanges.find(ex => ex.id === exchangeId);
            setSuccess(
                `${exchange.naziv} je ${newStatus ? "otvorena" : "zatvorena"}.`
            );
            setTimeout(() => setSuccess(""), 3000);
        } catch {
            setError("Greška pri izmjeni statusa burze.");
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
                        <h1 className="berza-title">Burze</h1>
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
                        <h1 className="berza-title">Burze</h1>
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

                {/* ── HEADER ── */}
                <div className="berza-header">
                    <button className="berza-back-btn" onClick={() => navigate("/dashboard")}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <h1 className="berza-title">Burze</h1>
                </div>

                {/* ── MESSAGES ── */}
                {success && <p className="berza-msg berza-msg--success">{success}</p>}
                {error && <p className="berza-msg berza-msg--error">{error}</p>}

                {/* ── EXCHANGES LIST ── */}
                <div className="berza-list">
                    {exchanges.map(exchange => (
                        <div key={exchange.id} className="berza-card">
                            <div className="berza-card-header">
                                <h2 className="berza-exchange-name">{exchange.naziv}</h2>
                                <div className={`berza-status ${exchange.isOpen ? "berza-status--open" : "berza-status--closed"}`}>
                                    {exchange.isOpen ? "Otvorena" : "Zatvorena"}
                                </div>
                            </div>

                            <div className="berza-card-info">
                                <div className="berza-info-item">
                                    <label className="berza-info-label">Valuta:</label>
                                    <span className="berza-info-value">{exchange.valuta}</span>
                                </div>
                                <div className="berza-info-item">
                                    <label className="berza-info-label">Vremenska zona:</label>
                                    <span className="berza-info-value">{exchange.timezone}</span>
                                </div>
                            </div>

                            <div className="berza-card-toggle">
                                <label className="berza-toggle-label">Status za testiranje:</label>
                                <button
                                    className={`berza-toggle-btn ${exchange.isOpen ? "berza-toggle-btn--open" : ""}`}
                                    onClick={() => handleToggleStatus(exchange.id, exchange.isOpen)}
                                    title={`Klikni da promijeniš status u ${exchange.isOpen ? "zatvorena" : "otvorena"}`}
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
