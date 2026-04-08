import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAccounts } from "../services/AccountService";
import Sidebar from "../components/Sidebar.jsx";
import "./AccountsPage.css";

function fmt(amount, currency) {
    if (amount == null) return "—";

    const formattedAmount = new Intl.NumberFormat("sr-RS", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);

    return currency ? `${formattedAmount} ${currency}` : formattedAmount;
}

function isBusinessAccount(account) {
    const type = String(account?.account_type || "").toLowerCase();
    return type.includes("business") || type.includes("poslov") || Boolean(account?.company_name);
}

export default function AccountsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = location.pathname.startsWith("/admin");
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 15;

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const data = await getAccounts();
                if (!cancelled) setAccounts(data);
            } catch {
                if (!cancelled) setError("Greška pri učitavanju računa.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, []);

    const uniqueTypes = useMemo(() =>
            [...new Set(accounts.map((a) => a.account_type).filter(Boolean))].sort(),
        [accounts]
    );

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();

        return accounts
            .filter((a) => {
                const matchesSearch =
                    !term ||
                    a.account_number?.toLowerCase().includes(term) ||
                    a.account_name?.toLowerCase().includes(term) ||
                    String(a.owner_id).includes(term);

                const matchesType = !filterType || a.account_type === filterType;

                return matchesSearch && matchesType;
            })
            .sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));
    }, [accounts, searchTerm, filterType]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const paginatedAccounts = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    return (
        <div className="accs-shell">
            <div className="accs-content">
                <Sidebar />

                <div className="accs-header">
                    <button className="ad-back-btn" onClick={() => navigate(isAdmin ? "/employees" : "/dashboard")}>
                        <ChevronLeftIcon />
                    </button>
                    <div className="accs-title-block">
                        <p>{isAdmin ? "Admin" : "Moji računi"}</p>
                        <h1>Pregled računa</h1>
                    </div>
                </div>

                <div className="accs-filters">
                    <div className="accs-search-wrapper">
                        <span className="accs-search-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            className="accs-input"
                            placeholder="Pretraga po broju, imenu ili klijentu..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select className="accs-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="">Svi tipovi</option>
                        {uniqueTypes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <button className="accs-reset-btn" onClick={() => { setSearchTerm(""); setFilterType(""); }}>
                        Reset
                    </button>
                </div>

                <p className="accs-filter-info">
                    Pronađeno: <strong>{filtered.length}</strong> / {accounts.length} računa
                </p>

                {loading && <p className="accs-state-msg">Učitavanje...</p>}
                {error && <p className="accs-state-msg accs-state-msg--error">{error}</p>}

                {!loading && !error && (
                    <>
                        <div className="accs-table-wrap">
                            <table className="accs-table">
                                <thead>
                                <tr>
                                    <th>Broj računa</th>
                                    <th>Naziv</th>
                                    <th>Klijent ID</th>
                                    <th>Tip</th>
                                    <th>Valuta</th>
                                    <th>Stanje</th>
                                    <th>Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {paginatedAccounts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="accs-empty">Nema rezultata</td>
                                    </tr>
                                ) : (
                                    paginatedAccounts.map((a) => (
                                        <tr
                                            key={a.account_number}
                                            className="accs-row"
                                            onClick={() => {
                                                if (isAdmin) {
                                                    if (isBusinessAccount(a)) {
                                                        navigate(`/admin/accounts/business/${a.account_number}`);
                                                    } else {
                                                        navigate(`/admin/accounts/${a.account_number}`);
                                                    }
                                                } else {
                                                    navigate(`/accounts/${a.account_number}`, { state: { from: "/accounts" } });
                                                }
                                            }}
                                        >
                                            <td className="accs-number">{a.account_number}</td>
                                            <td>{a.account_name}</td>
                                            <td>{a.owner_id}</td>
                                            <td>{a.account_type}</td>
                                            <td>{a.currency}</td>
                                            <td>{fmt(a.balance, a.currency)}</td>
                                            <td>
                                                    <span className={`accs-badge ${a.status === "Aktivan" ? "accs-badge--active" : "accs-badge--inactive"}`}>
                                                        {a.status}
                                                    </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>

                        <div className="pagination">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                                Prethodna
                            </button>
                            <span>Strana {currentPage} / {totalPages || 1}</span>
                            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>
                                Sledeća
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ChevronLeftIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
        </svg>
    );
}