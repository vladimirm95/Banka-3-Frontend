import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { listActiveOffers, acceptOffer, rejectOffer, counterOffer } from "../services/OtcService.js";
import { formatCurrency } from "../utils/loanCalculations.js";
import "./OtcOffersPage.css";

function fmt(minor, currency = "RSD") {
    return formatCurrency((Number(minor) || 0) / 100, currency);
}

function fmtDate(unix) {
    if (!unix) return "—";
    return new Date(unix * 1000).toLocaleString("sr-RS");
}

function statusLabel(status) {
    switch (status) {
        case "pending": return "Na čekanju";
        case "accepted": return "Prihvaćena";
        case "rejected": return "Odbijena";
        default: return status;
    }
}

function statusClass(status) {
    switch (status) {
        case "pending": return "otc-status--pending";
        case "accepted": return "otc-status--accepted";
        case "rejected": return "otc-status--rejected";
        default: return "";
    }
}

export default function OtcOffersPage() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionMsg, setActionMsg] = useState("");
    const [actionError, setActionError] = useState("");
    const [counterModal, setCounterModal] = useState(null);
    const [counterPrice, setCounterPrice] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const data = await listActiveOffers();
                setOffers(Array.isArray(data) ? data : []);
            } catch (e) {
                setError(e.message || "Greška pri učitavanju ponuda.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    async function handleAccept(offerId) {
        setActionMsg("");
        setActionError("");
        try {
            await acceptOffer(offerId);
            setOffers((prev) =>
                prev.map((o) => o.id === offerId ? { ...o, status: "accepted" } : o)
            );
            setActionMsg("Ponuda je prihvaćena.");
        } catch (e) {
            setActionError(e.message || "Greška pri prihvatanju ponude.");
        }
    }

    async function handleReject(offerId) {
        setActionMsg("");
        setActionError("");
        try {
            await rejectOffer(offerId);
            setOffers((prev) =>
                prev.map((o) => o.id === offerId ? { ...o, status: "rejected" } : o)
            );
            setActionMsg("Ponuda je odbijena.");
        } catch (e) {
            setActionError(e.message || "Greška pri odbijanju ponude.");
        }
    }

    async function handleCounter() {
        if (!counterModal) return;
        const price = parseFloat(counterPrice);
        if (!counterPrice || isNaN(price) || price <= 0) {
            setActionError("Unesite ispravnu cenu za kontraponudu.");
            return;
        }
        setActionMsg("");
        setActionError("");
        try {
            await counterOffer(counterModal.id, { price_per_unit: Math.round(price * 100) });
            setCounterModal(null);
            setCounterPrice("");
            setActionMsg(`Kontraponuda za ${counterModal.ticker} je poslata.`);
        } catch (e) {
            setActionError(e.message || "Greška pri slanju kontraponude.");
        }
    }

    return (
        <div className="otc-page">
            <Sidebar />

            <h1 className="otc-title">Aktivne OTC ponude</h1>

            {actionMsg && <div className="otc-banner otc-banner--ok">{actionMsg}</div>}
            {actionError && <div className="otc-banner otc-banner--error">{actionError}</div>}

            {loading ? (
                <div className="otc-empty">Učitavanje…</div>
            ) : error ? (
                <div className="otc-empty otc-error">{error}</div>
            ) : (
                <div className="otc-table-wrapper">
                    <table className="otc-table">
                        <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Količina</th>
                            <th>Cena po kom.</th>
                            <th>Ukupno</th>
                            <th>Prodavac</th>
                            <th>Datum</th>
                            <th>Status</th>
                            <th>Akcije</th>
                        </tr>
                        </thead>
                        <tbody>
                        {offers.length === 0 && (
                            <tr>
                                <td colSpan={8} className="otc-empty-cell">
                                    Nema aktivnih ponuda.
                                </td>
                            </tr>
                        )}
                        {offers.map((o) => (
                            <tr key={o.id}>
                                <td className="otc-ticker">{o.ticker}</td>
                                <td>{o.quantity}</td>
                                <td>{fmt(o.price_per_unit, o.currency)}</td>
                                <td>{fmt(o.total_price, o.currency)}</td>
                                <td>{o.seller}</td>
                                <td>{fmtDate(o.created_at)}</td>
                                <td>
                                        <span className={`otc-status ${statusClass(o.status)}`}>
                                            {statusLabel(o.status)}
                                        </span>
                                </td>
                                <td>
                                    {o.status === "pending" && (
                                        <div className="otc-actions">
                                            <button
                                                className="otc-btn otc-btn--accept"
                                                onClick={() => handleAccept(o.id)}
                                            >
                                                Prihvati
                                            </button>
                                            <button
                                                className="otc-btn otc-btn--reject"
                                                onClick={() => handleReject(o.id)}
                                            >
                                                Odbij
                                            </button>
                                            <button
                                                className="otc-btn otc-btn--counter"
                                                onClick={() => {
                                                    setCounterModal(o);
                                                    setCounterPrice("");
                                                }}
                                            >
                                                Kontraponuda
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {counterModal && (
                <div className="otc-overlay" onClick={() => setCounterModal(null)}>
                    <div className="otc-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Kontraponuda za {counterModal.ticker}</h2>
                        <p className="otc-modal-hint">
                            Originalna cena: {fmt(counterModal.price_per_unit, counterModal.currency)} po komadu.
                            Unesite novu cenu:
                        </p>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Nova cena po komadu (RSD)"
                            value={counterPrice}
                            onChange={(e) => setCounterPrice(e.target.value)}
                            className="otc-modal-input"
                        />
                        <div className="otc-modal-actions">
                            <button className="otc-btn-secondary" onClick={() => setCounterModal(null)}>
                                Otkaži
                            </button>
                            <button className="otc-btn-primary" onClick={handleCounter}>
                                Pošalji
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}