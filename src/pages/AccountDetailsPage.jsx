import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAccountByNumber, getAccountTransactions } from "../services/AccountService";
import Sidebar from "../components/Sidebar.jsx";
import "./AccountDetailsPage.css";

// Helper za formatiranje novca
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

export default function AccountDetailsPage() {
    const { accountNumber } = useParams(); // 'id' je string broj računa iz URL-a
    const navigate = useNavigate();

    const [account, setAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!accountNumber) return;
        let cancelled = false;

        const load = async () => {
            try {
                // BITNO: id (broj računa) šaljemo kao string da ne izgubimo preciznost
                const [acc, txs] = await Promise.all([
                    getAccountByNumber(accountNumber),
                    getAccountTransactions(accountNumber),
                ]);
                
                if (!cancelled) {
                    setAccount(acc);
                    // Proveravamo da li su transakcije niz, ako nisu stavljamo prazan niz
                    setTransactions(Array.isArray(txs) ? txs : []);
                }
            } catch (err) {
                console.error("Greška pri učitavanju:", err);
                if (!cancelled) setError("Greška pri učitavanju podataka o računu.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [accountNumber]);

    if (loading) {
        return (
            <div className="ad-page">
                <p className="ad-state-msg">Učitavanje podataka...</p>
            </div>
        );
    }

    if (error || !account) {
        return (
            <div className="ad-page">
                <p className="ad-state-msg ad-state-msg--error">{error || "Račun nije pronađen."}</p>
                <button className="ad-back-btn" style={{margin: '0 auto'}} onClick={() => navigate("/dashboard")}>Nazad</button>
            </div>
        );
    }

    // Računanje rezervisanih sredstava
    const reservedAmount = (account.balance || 0) - (account.available_balance || 0);

    return (
        <div className="ad-page">
            <div className="ad-content">
                <Sidebar/>
                
                {/* ── HEADER ── */}
                <div className="ad-header">
                    <button className="ad-back-btn" onClick={() => navigate("/dashboard")}>
                        <ChevronLeftIcon />
                    </button>
                    <h1 className="ad-title">{account.account_name || "Detalji računa"}</h1>
                </div>

                {/* ── BALANCE CARD ── */}
                <div className="ad-balance-card">
                    <div className="dash-bc-circle1"/>
                    <div className="dash-bc-circle2"/>
                    
                    <p className="ad-account-number">{account.account_number}</p>
                    <p className="ad-balance-main">{fmt(account.balance, account.currency)}</p>
                    
                    <div className="ad-balance-row">
                        <div>
                            <p className="ad-balance-label">Raspoloživo</p>
                            <p className="ad-balance-available">
                                {fmt(account.available_balance, account.currency)}
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

                {/* ── TRANSACTIONS ── */}
                <h2 className="ad-section-title">Poslednje transakcije</h2>

                {transactions.length === 0 ? (
                    <p className="ad-empty">Nema zabeleženih transakcija za ovaj račun.</p>
                ) : (
                    <div className="ad-txn-list">
                        {transactions.map((tx, index) => {
                            const amt = tx.final_amount || tx.initial_amount || tx.amount || 0;
                            const isDebit = tx.from_account === account.account_number;

                            return (
                                <div key={tx.id || index} className="ad-txn-row">
                                    <div className={`ad-txn-icon ${!isDebit ? "ad-txn-icon--credit" : "ad-txn-icon--debit"}`}>
                                        {!isDebit ? <ArrowDownIcon /> : <ArrowUpIcon />}
                                    </div>
                                    <div className="ad-txn-info">
                                        <p className="ad-txn-desc">{tx.purpose || tx.reason || "Transakcija"}</p>
                                        <p className="ad-txn-date">
                                            {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString("sr-RS") : "---"}
                                        </p>
                                    </div>
                                    <p className={`ad-txn-amount ${!isDebit ? "ad-txn-amount--credit" : ""}`}>
                                        {isDebit ? "-" : "+"}{fmt(amt, account.currency)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// Ikone
function ChevronLeftIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
        </svg>
    );
}

function ArrowDownIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7-7 7 7" />
        </svg>
    );
}

function ArrowUpIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
    );
}