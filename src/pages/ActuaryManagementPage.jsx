import { useState, useEffect } from "react";
import { ActuaryService } from "../services/ActuaryService";
import "./ActuaryManagementPage.css";

function formatCurrency(val) {
    return new Intl.NumberFormat("sr-RS", {
        style: "currency",
        currency: "RSD",
        maximumFractionDigits: 0,
    }).format(val || 0);
}

function LimitBar({ used, total }) {
    const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    const color = pct > 90 ? "#f87171" : pct > 60 ? "#fbbf24" : "#34d399";
    return (
        <div className="amp-bar-track">
            <div className="amp-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
    );
}

export default function ActuaryManagementPage() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filters, setFilters] = useState({ name: "", email: "", position: "" });
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [editError, setEditError] = useState("");
    const [confirmReset, setConfirmReset] = useState(null);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        loadAgents();
    }, []);

    const loadAgents = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await ActuaryService.getAllAgents();
            setAgents(data);
        } catch (err) {
            console.error("Error loading agents:", err);
            setError(err.message || "Greška pri učitavanju agenata.");
        } finally {
            setLoading(false);
        }
    };

    const filtered = agents.filter((a) => {
        const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
        return (
            fullName.includes(filters.name.toLowerCase()) &&
            a.email.toLowerCase().includes(filters.email.toLowerCase()) &&
            a.position.toLowerCase().includes(filters.position.toLowerCase())
        );
    });

    const handleLimitSave = async (id) => {
        setEditError("");
        const val = parseFloat(editValue);
        if (isNaN(val) || val <= 0) {
            setEditError("Limit mora biti veći od 0");
            return;
        }
        try {
            setSaving(true);
            const updated = await ActuaryService.updateAgentLimit(id, val);
            setAgents(agents.map((a) => (a.id === id ? { ...a, limit: updated.limit } : a)));
            setEditingId(null);
            setEditValue("");
            setSuccessMsg("Limit ažuriran");
        } catch (err) {
            console.error("Error updating limit:", err);
            setEditError(err.response?.data?.message || err.message || "Greška pri ažuriranju limita.");
        } finally {
            setSaving(false);
        }
    };

    const handleResetUsed = async (id) => {
        try {
            setSaving(true);
            const updated = await ActuaryService.resetUsedLimit(id);
            setAgents(agents.map((a) => (a.id === id ? { ...a, usedLimit: updated.usedLimit } : a)));
            setConfirmReset(null);
            setSuccessMsg("usedLimit resetovan");
        } catch (err) {
            console.error("Error resetting limit:", err);
            setError(err.response?.data?.message || err.message || "Greška pri resetovanju limita.");
            setConfirmReset(null);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="amp-page">
                <div className="amp-header">
                    <h1 className="amp-title act-title">Učitavanje...</h1>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="amp-page">
                <div className="amp-header">
                    <div>
                        <h1 className="amp-title act-title">Greška</h1>
                        <p className="amp-subtitle act-error" style={{ color: "#f87171" }}>{error}</p>
                    </div>
                </div>
                <button className="amp-btn-edit" onClick={loadAgents} style={{ marginTop: "20px" }}>
                    Pokušaj ponovo
                </button>
            </div>
        );
    }

    return (
        <div className="amp-page">
            <div className="amp-header">
                <div>
                    <h1 className="amp-title act-title">Upravljanje aktuarima</h1>
                    <p className="amp-subtitle">Pregled i upravljanje limitima agenata</p>
                </div>
                <div className="amp-badge">Supervisor</div>
            </div>

            {successMsg && (
                <div className="amp-success act-success" role="status">
                    {successMsg}
                    <button
                        type="button"
                        className="amp-success-close"
                        onClick={() => setSuccessMsg("")}
                        aria-label="Zatvori"
                    >×</button>
                </div>
            )}

            <div className="amp-filters act-filters">
                <div className="amp-filter-field">
                    <label className="amp-filter-label">Ime i prezime</label>
                    <input
                        className="amp-filter-input"
                        type="text"
                        placeholder="Ime"
                        value={filters.name}
                        onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                    />
                </div>
                <div className="amp-filter-field">
                    <label className="amp-filter-label">Email</label>
                    <input
                        className="amp-filter-input"
                        type="text"
                        placeholder="Email"
                        value={filters.email}
                        onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                    />
                </div>
                <div className="amp-filter-field">
                    <label className="amp-filter-label">Pozicija</label>
                    <input
                        className="amp-filter-input"
                        type="text"
                        placeholder="Pozicija"
                        value={filters.position}
                        onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                    />
                </div>
            </div>

            <div className="amp-table-wrap">
                <table className="amp-table act-table">
                    <thead>
                        <tr>
                            <th>Ime i prezime</th>
                            <th>Email</th>
                            <th>Pozicija</th>
                            <th>Limit</th>
                            <th>Used limit</th>
                            <th>Iskorišćenost</th>
                            <th>Akcije</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="amp-empty">
                                    {agents.length === 0
                                        ? "Trenutno nema registrovanih agenata."
                                        : "Nema pronađenih agenata sa datim filterima."}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((agent) => (
                                <tr key={agent.id}>
                                    <td className="amp-td-name">
                                        <div className="amp-avatar">
                                            {agent.firstName[0]}
                                            {agent.lastName[0]}
                                        </div>
                                        <span>
                                            {agent.firstName} {agent.lastName}
                                        </span>
                                    </td>
                                    <td className="amp-td-muted">{agent.email}</td>
                                    <td>
                                        <span className="amp-position-badge">{agent.position}</span>
                                    </td>
                                    <td>
                                        {editingId === agent.id ? (
                                            <div className="amp-edit-row">
                                                <input
                                                    className="amp-edit-input"
                                                    type="number"
                                                    min="0"
                                                    step="1000"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    disabled={saving}
                                                    autoFocus
                                                />
                                                <button
                                                    className="amp-btn-save"
                                                    onClick={() => handleLimitSave(agent.id)}
                                                    disabled={saving}
                                                >
                                                    Sačuvaj
                                                </button>
                                                <button
                                                    className="amp-btn-cancel"
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        setEditValue("");
                                                        setEditError("");
                                                    }}
                                                    disabled={saving}
                                                >
                                                    Otkaži
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="amp-limit-btn"
                                                onClick={() => {
                                                    setEditingId(agent.id);
                                                    setEditValue(String(agent.limit));
                                                    setEditError("");
                                                }}
                                                disabled={editingId !== null || saving}
                                                title="Klikni za izmenu limita"
                                            >
                                                {formatCurrency(agent.limit)}
                                            </button>
                                        )}
                                        {editingId === agent.id && editError && (
                                            <div className="amp-error act-error">{editError}</div>
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            className={`amp-used-val ${
                                                agent.limit > 0 && agent.usedLimit / agent.limit > 0.9
                                                    ? "amp-used-val--danger"
                                                    : ""
                                            }`}
                                        >
                                            {formatCurrency(agent.usedLimit)}
                                        </span>
                                    </td>
                                    <td className="amp-td-bar">
                                        <LimitBar used={agent.usedLimit} total={agent.limit} />
                                        <span className="amp-bar-pct">
                                            {agent.limit > 0
                                                ? Math.round((agent.usedLimit / agent.limit) * 100)
                                                : 0}
                                            %
                                        </span>
                                    </td>
                                    <td>
                                        <div className="amp-actions">
                                            <button
                                                className="amp-btn-reset"
                                                onClick={() => setConfirmReset(agent.id)}
                                                disabled={saving}
                                                title="Resetuj iskorišćeni limit"
                                            >
                                                Reset usedLimit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {confirmReset !== null && (
                <div className="amp-modal-overlay" onClick={() => !saving && setConfirmReset(null)}>
                    <div className="amp-modal act-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="amp-modal-title">Potvrda resetovanja</h3>
                        <p className="amp-modal-text">
                            Da li ste sigurni da želite da resetujete iskorišćeni limit na{" "}
                            <strong>0 RSD</strong> za ovog agenta?
                        </p>
                        <div className="amp-modal-actions">
                            <button
                                className="amp-btn-cancel-modal"
                                onClick={() => setConfirmReset(null)}
                                disabled={saving}
                            >
                                Odustani
                            </button>
                            <button
                                className="amp-btn-confirm"
                                onClick={() => handleResetUsed(confirmReset)}
                                disabled={saving}
                            >
                                {saving ? "Resetovanje..." : "Potvrdi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
