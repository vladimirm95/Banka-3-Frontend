import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { getClientById } from "../services/ClientService";
import { getAccounts } from "../services/AccountService";
import "./ClientDetailsPage.css";

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(typeof value === "number" ? value * 1000 : value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("sr-RS");
}

function formatMoney(amount, currency = "RSD") {
    if (amount == null) return "—";
    return `${new Intl.NumberFormat("sr-RS", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)} ${currency}`;
}

function ProfileField({ label, value }) {
    return (
        <div className="profile-field">
            <span className="pf-label">{label}</span>
            <span className="pf-value">{value || "—"}</span>
        </div>
    );
}

export default function ClientDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        async function loadData() {
            try {
                const [clientData, accountsData] = await Promise.all([
                    getClientById(id),
                    getAccounts(),
                ]);

                if (!cancelled) {
                    setClient(clientData);
                    setAccounts(accountsData || []);
                    if (!clientData) {
                        setError("Klijent nije pronađen.");
                    }
                }
            } catch {
                if (!cancelled) {
                    setError("Greška pri učitavanju detalja klijenta.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadData();
        return () => {
            cancelled = true;
        };
    }, [id]);

    const clientAccounts = useMemo(() => {
        return accounts.filter((account) => String(account.owner_id) === String(id));
    }, [accounts, id]);

    if (loading) {
        return (
            <div className="page-bg">
                <img src="/bank-logo.png" alt="logo" className="bank-logo" />
                <Sidebar />
                <div className="profile-page">
                    <div className="profile-card profile-state-card">
                        <p className="profile-state-text">Učitavanje...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !client) {
        return (
            <div className="page-bg">
                <img src="/bank-logo.png" alt="logo" className="bank-logo" />
                <Sidebar />
                <div className="profile-page">
                    <div className="profile-card profile-state-card">
                        <p className="profile-state-text error">{error || "Klijent nije pronađen."}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-bg">
            <img src="/bank-logo.png" alt="logo" className="bank-logo" />
            <Sidebar />

            <div className="profile-page">
                <div className="profile-card">
                    <div className="profile-header">
                        <div className="profile-header-text">
                            <p className="profile-eyebrow">DETALJI KLIJENTA</p>
                            <h1 className="profile-title">Profil klijenta</h1>
                            <p className="profile-subtitle">
                                Pregled osnovnih podataka i svih računa povezanih sa izabranim klijentom.
                            </p>
                        </div>

                        <div className="profile-header-actions">
                            <button className="profile-btn profile-btn-secondary" onClick={() => navigate("/clients")}>
                                Nazad
                            </button>
                        </div>
                    </div>

                    <div className="profile-overview-card">
                        <div className="profile-overview-left">
                            <div className="profile-avatar">
                                <span>{client.firstName?.[0] || "K"}{client.lastName?.[0] || "L"}</span>
                            </div>

                            <div className="profile-main-info">
                                <h2>{client.firstName} {client.lastName}</h2>
                                <p>{client.email || "Bez email adrese"}</p>

                                <div className="profile-meta-row">
                                    <span className="role-badge">Klijent ID: {client.id}</span>
                                    <span className={`status-badge ${clientAccounts.length > 0 ? "is-active" : "is-inactive"}`}>
                    {clientAccounts.length > 0 ? `${clientAccounts.length} računa` : "Bez računa"}
                  </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="profile-grid client-profile-grid">
                        <div className="profile-info-card">
                            <h3 className="section-title">Lični podaci</h3>
                            <div className="profile-fields-grid">
                                <ProfileField label="Ime" value={client.firstName} />
                                <ProfileField label="Prezime" value={client.lastName} />
                                <ProfileField label="Pol" value={client.gender === "M" ? "Muški" : client.gender === "F" ? "Ženski" : "—"} />
                                <ProfileField label="Datum rođenja" value={formatDate(client.dateOfBirth)} />
                            </div>
                        </div>

                        <div className="profile-info-card">
                            <h3 className="section-title">Kontakt</h3>
                            <div className="profile-fields-grid">
                                <ProfileField label="Email" value={client.email} />
                                <ProfileField label="Telefon" value={client.phone} />
                                <ProfileField label="Adresa" value={client.address} />
                                <ProfileField label="Korisničko ime" value={client.username} />
                            </div>
                        </div>
                    </div>

                    <div className="profile-info-card client-accounts-card">
                        <h3 className="section-title">Računi klijenta</h3>

                        {clientAccounts.length === 0 ? (
                            <p className="client-accounts-empty">Klijent trenutno nema povezane račune.</p>
                        ) : (
                            <div className="client-accounts-table-wrap">
                                <table className="client-accounts-table">
                                    <thead>
                                    <tr>
                                        <th>Broj računa</th>
                                        <th>Naziv</th>
                                        <th>Tip</th>
                                        <th>Valuta</th>
                                        <th>Stanje</th>
                                        <th>Status</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {clientAccounts.map((account) => (
                                        <tr
                                            key={account.account_number}
                                            className="client-account-row"
                                            onClick={() => navigate(`/admin/accounts/${account.account_number}`)}
                                        >
                                            <td>{account.account_number}</td>
                                            <td>{account.account_name || "—"}</td>
                                            <td>{account.account_type || "—"}</td>
                                            <td>{account.currency || "—"}</td>
                                            <td>{formatMoney(account.balance, account.currency)}</td>
                                            <td>{account.status || "—"}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}