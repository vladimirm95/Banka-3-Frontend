import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    getAccountByNumber,
    getAccountTransactions,
    getAccounts,
    renameAccount,
} from "../services/AccountService";
import Sidebar from "../components/Sidebar.jsx";
import "./AccountDetailsPage.css";

function fmt(amount, currency) {
    if (amount == null || Number.isNaN(Number(amount))) return "—";

    const formattedAmount = new Intl.NumberFormat("sr-RS", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(amount));

    return currency ? `${formattedAmount} ${currency}` : formattedAmount;
}

function formatAccountType(type) {
    if (!type) return "—";

    const value = String(type).toLowerCase();

    if (value === "checking") return "Tekući račun";
    if (value === "foreign") return "Devizni račun";
    if (value === "business") return "Poslovni račun";
    return type;
}

function formatStatus(status) {
    if (!status) return "—";

    const value = String(status).toLowerCase();
    if (value === "active" || value === "aktivan") return "Aktivan";
    if (value === "inactive" || value === "neaktivan") return "Neaktivan";
    if (value === "blocked") return "Blokiran";

    return status;
}

function getOwnerLabel(account) {
    return (
        account?.owner_name ||
        account?.client_name ||
        account?.owner_full_name ||
        account?.owner_id ||
        "—"
    );
}

function getCompanyLabel(account) {
    return (
        account?.company_name ||
        account?.business_name ||
        account?.firm_name ||
        account?.firmName ||
        null
    );
}

function isBusinessAccount(account) {
    const type = String(account?.account_type || "").toLowerCase();
    return Boolean(
        account?.company_name ||
        account?.business_name ||
        account?.firm_name ||
        account?.firmName ||
        type.includes("business") ||
        type.includes("poslov")
    );
}

export default function AccountDetailsPage() {
    const { accountNumber } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const backTarget = location.state?.from || "/accounts";

    const [account, setAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [allAccounts, setAllAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [newAccountName, setNewAccountName] = useState("");
    const [renameError, setRenameError] = useState("");
    const [renameLoading, setRenameLoading] = useState(false);

    useEffect(() => {
        if (!accountNumber) return;
        let cancelled = false;

        const load = async () => {
            try {
                const [acc, txs, accountsData] = await Promise.all([
                    getAccountByNumber(accountNumber),
                    getAccountTransactions(accountNumber),
                    getAccounts().catch(() => []),
                ]);

                if (!cancelled) {
                    setAccount(acc);
                    setTransactions(Array.isArray(txs) ? txs : []);
                    setAllAccounts(Array.isArray(accountsData) ? accountsData : []);
                    setNewAccountName(acc?.account_name || "");
                }
            } catch (err) {
                console.error("Greška pri učitavanju:", err);
                if (!cancelled) {
                    setError("Greška pri učitavanju podataka o računu.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [accountNumber]);

    const reservedAmount = useMemo(() => {
        const balance = Number(account?.balance || 0);
        const available = Number(account?.available_balance ?? account?.balance ?? 0);
        const reserved = balance - available;
        return reserved > 0 ? reserved : 0;
    }, [account]);

    const businessAccount = useMemo(() => isBusinessAccount(account), [account]);

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

            const sameOwner =
                String(acc.owner_id ?? "") === String(account?.owner_id ?? "");

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
            console.error("Greška pri promeni naziva računa:", err);
            setRenameError("Promena naziva računa nije uspela. Proveri backend rutu.");
        } finally {
            setRenameLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="ad-page">
                <div className="ad-content">
                    <p className="ad-state-msg">Učitavanje podataka...</p>
                </div>
            </div>
        );
    }

    if (error || !account) {
        return (
            <div className="ad-page">
                <div className="ad-content">
                    <p className="ad-state-msg ad-state-msg--error">
                        {error || "Račun nije pronađen."}
                    </p>
                    <div className="ad-center-actions">
                        <button className="ad-back-btn" onClick={() => navigate(backTarget)}>
                            <ChevronLeftIcon />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ad-page">
            <div className="ad-content">
                <Sidebar />

                <div className="ad-header">
                    <button className="ad-back-btn" onClick={() => navigate(backTarget)}>
                        <ChevronLeftIcon />
                    </button>
                    <h1 className="ad-title">{account.account_name || "Detalji računa"}</h1>
                </div>

                <div className="ad-balance-card">
                    <div className="dash-bc-circle1" />
                    <div className="dash-bc-circle2" />

                    <p className="ad-account-number">{account.account_number}</p>
                    <p className="ad-balance-main">{fmt(account.balance, account.currency)}</p>

                    <div className="ad-balance-row">
                        <div>
                            <p className="ad-balance-label">Raspoloživo</p>
                            <p className="ad-balance-available">
                                {fmt(account.available_balance ?? account.balance, account.currency)}
                            </p>
                        </div>
                        <div>
                            <p className="ad-balance-label">Rezervisano</p>
                            <p className="ad-balance-reserved">
                                {fmt(reservedAmount, account.currency)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="ad-details-card">
                    <h2 className="ad-section-title">Detalji računa</h2>

                    <div className="ad-details-grid">

                        <div className="ad-detail-item">
                            <span className="ad-detail-label">ID vlasnika</span>
                            <strong className="ad-detail-value">{getOwnerLabel(account)}</strong>
                        </div>

                        <div className="ad-detail-item">
                            <span className="ad-detail-label">Tip</span>
                            <strong className="ad-detail-value">{formatAccountType(account.account_type)}</strong>
                        </div>

                        <div className="ad-detail-item">
                            <span className="ad-detail-label">Valuta</span>
                            <strong className="ad-detail-value">{account.currency || "—"}</strong>
                        </div>

                        <div className="ad-detail-item">
                            <span className="ad-detail-label">Status</span>
                            <strong className="ad-detail-value">{formatStatus(account.status)}</strong>
                        </div>

                        {businessAccount && (
                            <div className="ad-detail-item">
                                <span className="ad-detail-label">Firma</span>
                                <strong className="ad-detail-value">{getCompanyLabel(account) || "—"}</strong>
                            </div>
                        )}
                    </div>

                    <div className="ad-actions">
                        <button className="ad-action-btn" onClick={handleOpenRename}>
                            Promena naziva računa
                        </button>

                        <button
                            className="ad-action-btn"
                            onClick={() => navigate("/payment", { state: { fromAccount: account } })}
                        >
                            Novo plaćanje
                        </button>

                        <button
                            className="ad-action-btn ad-action-btn--secondary"
                            type="button"
                            onClick={() => alert("Promena limita zahteva verifikaciju i backend podršku.")}
                        >
                            Promena limita
                        </button>
                    </div>
                </div>

                <h2 className="ad-section-title">Poslednje transakcije</h2>

                {transactions.length === 0 ? (
                    <p className="ad-empty">Nema zabeleženih transakcija za ovaj račun.</p>
                ) : (
                    <div className="ad-txn-list">
                        {transactions.map((tx, index) => {
                            const amt = tx.final_amount || tx.initial_amount || tx.amount || 0;
                            const txCurrency = tx.currency || account.currency;
                            const isDebit = String(tx.from_account || "") === String(account.account_number || "");

                            return (
                                <div key={tx.id || index} className="ad-txn-row">
                                    <div
                                        className={`ad-txn-icon ${
                                            !isDebit ? "ad-txn-icon--credit" : "ad-txn-icon--debit"
                                        }`}
                                    >
                                        {!isDebit ? <ArrowDownIcon /> : <ArrowUpIcon />}
                                    </div>

                                    <div className="ad-txn-info">
                                        <p className="ad-txn-desc">{tx.purpose || tx.reason || "Transakcija"}</p>
                                        <p className="ad-txn-date">
                                            {tx.timestamp
                                                ? new Date(tx.timestamp).toLocaleDateString("sr-RS")
                                                : "---"}
                                        </p>
                                    </div>

                                    <p
                                        className={`ad-txn-amount ${
                                            !isDebit ? "ad-txn-amount--credit" : ""
                                        }`}
                                    >
                                        {isDebit ? "-" : "+"}
                                        {fmt(amt, txCurrency)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}

                {isRenameOpen && (
                    <div className="ad-modal-overlay" onClick={handleCloseRename}>
                        <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
                            <h3 className="ad-modal-title">Promena naziva računa</h3>

                            <p className="ad-modal-current">
                                Trenutni naziv: <strong>{account.account_name || "—"}</strong>
                            </p>

                            <label className="ad-modal-label" htmlFor="newAccountName">
                                Novo ime računa
                            </label>
                            <input
                                id="newAccountName"
                                className="ad-modal-input"
                                value={newAccountName}
                                onChange={(e) => setNewAccountName(e.target.value)}
                                placeholder="Unesi novo ime računa"
                            />

                            {renameError ? <p className="ad-modal-error">{renameError}</p> : null}

                            <div className="ad-modal-actions">
                                <button
                                    className="ad-action-btn ad-action-btn--secondary"
                                    type="button"
                                    onClick={handleCloseRename}
                                    disabled={renameLoading}
                                >
                                    Otkaži
                                </button>

                                <button
                                    className="ad-action-btn"
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
            </div>
        </div>
    );
}

function ChevronLeftIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M15 18l-6-6 6-6" />
        </svg>
    );
}

function ArrowDownIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 5v14M5 12l7-7 7 7" />
        </svg>
    );
}

function ArrowUpIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
    );
}