import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { getSecurities } from "../services/SecurityService.js";
import "./SecuritiesPage.css";

// Spec p.45: securities table auto-refreshes on a fixed interval. We split
// the cadence so manual refresh is instant while background polling stays
// quiet enough to not spam Alpha Vantage (rate limit 5 req/min).
const AUTO_REFRESH_MS = 60_000;

const ALL_TABS = [
    { key: "all",     label: "Sve" },
    { key: "stock",   label: "Akcije" },
    { key: "futures", label: "Futures" },
    { key: "forex",   label: "Forex" },
];

const SORT_FIELDS = { price: "price", volume: "volume", margin: "maintenanceMargin" };

// Tickers some users like to search for under shall-we-call-them creative
// names. Mapped to the real ticker so the table still filters cleanly.
// Review takeaway 3 — keep it lighthearted but not intrusive: only an exact
// (case-insensitive) match triggers the rewrite.
const SEARCH_ALIASES = {
    microslop: "microsoft",
    "msft.exe": "msft",
    crapple: "apple",
    googol: "google",
    teslol: "tesla",
};

function formatChange(change) {
    const decimals = Math.abs(change) < 1 ? 4 : 2;
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(decimals)}`;
}

function fmt(val) {
    return val.toFixed(val < 10 ? 4 : 2);
}

function SortIcon({ field, sortBy, sortDir }) {
    if (sortBy !== field) return <span className="sec-sort-icon sec-sort-icon--inactive">↕</span>;
    return <span className="sec-sort-icon">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

export default function SecuritiesPage() {
    const navigate  = useNavigate();
    const role      = sessionStorage.getItem("userRole");
    const isClient  = role === "client";

    const tabs = isClient
        ? ALL_TABS.filter(t => t.key !== "forex")
        : ALL_TABS;

    // ── data ──
    const [securities, setSecurities] = useState([]);
    const [loading,    setLoading]    = useState(true);  // starts true — no data yet
    const [refreshing, setRefreshing] = useState(false);
    const [error,      setError]      = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);

    // ── tab ──
    const [activeTab, setActiveTab] = useState("all");

    // ── search ──
    const [search, setSearch] = useState("");

    // ── filters (panel) ──
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [exchange,    setExchange]    = useState("");
    const [priceMin,    setPriceMin]    = useState("");
    const [priceMax,    setPriceMax]    = useState("");
    const [volumeMin,   setVolumeMin]   = useState("");
    const [volumeMax,   setVolumeMax]   = useState("");
    const [settlementFrom, setSettlementFrom] = useState("");
    const [settlementTo,   setSettlementTo]   = useState("");

    // ── sort ──
    const [sortBy,  setSortBy]  = useState(null);
    const [sortDir, setSortDir] = useState("asc");

    const fetchData = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setRefreshing(true);
        try {
            const res = await getSecurities();
            setSecurities(res.data);
            setError(null);
            setLastRefresh(res.timestamp || new Date().toLocaleString("sr-RS"));
        } catch {
            setError("Greška pri učitavanju hartija od vrednosti.");
        } finally {
            if (!silent) setRefreshing(false);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const initial = async () => {
            try {
                const res = await getSecurities();
                if (cancelled) return;
                setSecurities(res.data);
                setLastRefresh(res.timestamp || new Date().toLocaleString("sr-RS"));
            } catch {
                if (!cancelled) setError("Greška pri učitavanju hartija od vrednosti.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        initial();
        return () => { cancelled = true; };
    }, []);

    // Background poll — silent so we don't flash the loader. Cleared on
    // unmount to avoid leaking timers on route changes.
    const fetchRef = useRef(fetchData);
    fetchRef.current = fetchData;
    useEffect(() => {
        const handle = setInterval(() => {
            fetchRef.current({ silent: true });
        }, AUTO_REFRESH_MS);
        return () => clearInterval(handle);
    }, []);

    const uniqueExchanges = useMemo(() => {
        const inTab = securities.filter(s => {
            if (isClient && s.type === "forex") return false;
            if (activeTab !== "all" && s.type !== activeTab) return false;
            return true;
        });
        return [...new Set(inTab.map(s => s.exchange))].sort();
    }, [securities, isClient, activeTab]);

    const activeFiltersCount = [
        exchange, priceMin, priceMax, volumeMin, volumeMax,
        settlementFrom, settlementTo,
    ].filter(Boolean).length;

    const priceRangeError = (() => {
        const lo = parseFloat(priceMin);
        const hi = parseFloat(priceMax);
        if (!Number.isNaN(lo) && !Number.isNaN(hi) && lo > hi) {
            return "Minimalna cena ne može biti veća od maksimalne.";
        }
        return "";
    })();

    const processed = useMemo(() => {
        if (priceRangeError) return [];

        const fromTs = settlementFrom ? Date.parse(settlementFrom) : null;
        const toTs = settlementTo ? Date.parse(settlementTo) : null;

        let list = securities.filter(s => {
            if (isClient && s.type === "forex") return false;
            if (activeTab !== "all" && s.type !== activeTab) return false;

            const raw = search.trim().toLowerCase();
            const q = SEARCH_ALIASES[raw] ?? raw;
            if (q && !s.ticker.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q))
                return false;

            if (exchange && !s.exchange?.toUpperCase().startsWith(exchange.toUpperCase())) return false;

            const pMin = parseFloat(priceMin);
            const pMax = parseFloat(priceMax);
            const vMin = parseFloat(volumeMin);
            const vMax = parseFloat(volumeMax);
            if (!isNaN(pMin) && s.price < pMin) return false;
            if (!isNaN(pMax) && s.price > pMax) return false;
            if (!isNaN(vMin) && s.volume < vMin) return false;
            if (!isNaN(vMax) && s.volume > vMax) return false;

            // Settlement-date filter only applies to assets that have one
            // (futures and options); stocks/forex are exempt rather than
            // hidden so toggling the filter doesn't emptily clear the table.
            if ((fromTs || toTs) && s.settlementDate) {
                const settled = Date.parse(s.settlementDate);
                if (!Number.isNaN(settled)) {
                    if (fromTs && settled < fromTs) return false;
                    if (toTs && settled > toTs) return false;
                }
            }

            return true;
        });

        if (sortBy) {
            const field = SORT_FIELDS[sortBy];
            list = [...list].sort((a, b) => {
                const diff = a[field] - b[field];
                return sortDir === "asc" ? diff : -diff;
            });
        }

        return list;
    }, [
        securities, isClient, activeTab, search, exchange, priceMin, priceMax,
        volumeMin, volumeMax, settlementFrom, settlementTo, sortBy, sortDir,
        priceRangeError,
    ]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortDir("asc");
        }
    };

    const clearFilters = () => {
        setExchange("");
        setPriceMin("");
        setPriceMax("");
        setVolumeMin("");
        setVolumeMax("");
        setSettlementFrom("");
        setSettlementTo("");
    };

    const handleTabChange = (key) => {
        setActiveTab(key);
        clearFilters();
        setSearch("");
    };

    return (
        <div className="sec-page">
            <Sidebar />

            <div className="sec-header">
                <h1 className="sec-title">Hartije od vrednosti</h1>
                <div className="sec-header-actions">
                    {lastRefresh && (
                        <span className="sec-last-refresh">Poslednje osvežavanje: {lastRefresh}</span>
                    )}
                    <button
                        className="sec-refresh-btn"
                        onClick={() => fetchData()}
                        disabled={refreshing}
                    >
                        {refreshing ? "Osvežavanje..." : "Osveži cene"}
                    </button>
                </div>
            </div>

            {/* ── TABS ── */}
            <div className="sec-tabs" role="tablist">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        className={`sec-tab${activeTab === tab.key ? " sec-tab--active" : ""}`}
                        onClick={() => handleTabChange(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── SEARCH + FILTER TOGGLE ── */}
            <div className="sec-toolbar">
                <div className="sec-search-wrap">
                    <svg className="sec-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                        className="sec-search"
                        type="text"
                        placeholder="Pretraži po tickeru ili nazivu..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="sec-search-clear" onClick={() => setSearch("")} aria-label="Obriši pretragu">✕</button>
                    )}
                </div>

                <button
                    className={`sec-filter-btn${filtersOpen ? " sec-filter-btn--active" : ""}`}
                    onClick={() => setFiltersOpen(o => !o)}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                    </svg>
                    Filteri
                    {activeFiltersCount > 0 && (
                        <span className="sec-filter-badge">{activeFiltersCount}</span>
                    )}
                </button>
            </div>

            {/* ── FILTER PANEL ── */}
            {filtersOpen && (
                <div className="sec-filters">
                    <div className="sec-filter-row">
                        <div className="sec-filter-field">
                            <label className="sec-filter-label">Berza (prefiks)</label>
                            <input
                                className="sec-filter-input"
                                type="text"
                                placeholder="npr. NY"
                                value={exchange}
                                onChange={e => setExchange(e.target.value)}
                                list="sec-exchange-options"
                            />
                            <datalist id="sec-exchange-options">
                                {uniqueExchanges.map(ex => (
                                    <option key={ex} value={ex} />
                                ))}
                            </datalist>
                        </div>

                        <div className="sec-filter-field">
                            <label className="sec-filter-label">Cena od</label>
                            <input
                                className="sec-filter-input"
                                type="number"
                                min="0"
                                placeholder="Min"
                                value={priceMin}
                                onChange={e => setPriceMin(e.target.value)}
                            />
                        </div>

                        <div className="sec-filter-field">
                            <label className="sec-filter-label">Cena do</label>
                            <input
                                className="sec-filter-input"
                                type="number"
                                min="0"
                                placeholder="Max"
                                value={priceMax}
                                onChange={e => setPriceMax(e.target.value)}
                            />
                        </div>

                        <div className="sec-filter-field">
                            <label className="sec-filter-label">Volumen od</label>
                            <input
                                className="sec-filter-input"
                                type="number"
                                min="0"
                                placeholder="Min"
                                value={volumeMin}
                                onChange={e => setVolumeMin(e.target.value)}
                            />
                        </div>

                        <div className="sec-filter-field">
                            <label className="sec-filter-label">Volumen do</label>
                            <input
                                className="sec-filter-input"
                                type="number"
                                min="0"
                                placeholder="Max"
                                value={volumeMax}
                                onChange={e => setVolumeMax(e.target.value)}
                            />
                        </div>

                        {activeFiltersCount > 0 && (
                            <button className="sec-filter-clear" onClick={clearFilters}>
                                Resetuj filtere
                            </button>
                        )}
                    </div>

                    {/* Spec p.45: settlement-date filter is required for futures
                        (and useful for options). Stocks/forex carry no settlement
                        date, so the filter is a no-op for them — see processed.filter. */}
                    {(activeTab === "futures" || activeTab === "all") && (
                        <div className="sec-filter-row">
                            <div className="sec-filter-field">
                                <label className="sec-filter-label">Datum isteka od</label>
                                <input
                                    className="sec-filter-input"
                                    type="date"
                                    value={settlementFrom}
                                    onChange={e => setSettlementFrom(e.target.value)}
                                />
                            </div>
                            <div className="sec-filter-field">
                                <label className="sec-filter-label">Datum isteka do</label>
                                <input
                                    className="sec-filter-input"
                                    type="date"
                                    value={settlementTo}
                                    onChange={e => setSettlementTo(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {priceRangeError && (
                        <p className="sec-state sec-state--error" style={{ margin: "8px 0 0" }}>
                            {priceRangeError}
                        </p>
                    )}
                </div>
            )}

            {/* ── STATES ── */}
            {loading && <p className="sec-state">Učitavanje...</p>}
            {!loading && error  && <p className="sec-state sec-state--error">{error}</p>}
            {!loading && !error && processed.length === 0 && (
                <p className="sec-state">Nema hartija koje odgovaraju zadatim kriterijumima.</p>
            )}

            {/* ── TABLE ── */}
            {!loading && !error && processed.length > 0 && (
                <div className="sec-table-wrap">
                    <table className="sec-table">
                        <thead>
                            <tr>
                                <th>Ticker</th>
                                <th>Naziv</th>
                                <th>Tip</th>
                                <th
                                    className="sec-th--sortable"
                                    onClick={() => handleSort("price")}
                                    title="Sortiraj po ceni"
                                >
                                    Cena <SortIcon field="price" sortBy={sortBy} sortDir={sortDir} />
                                </th>
                                <th>Ask</th>
                                <th>Bid</th>
                                <th>Promena</th>
                                <th
                                    className="sec-th--sortable"
                                    onClick={() => handleSort("volume")}
                                    title="Sortiraj po volumenu"
                                >
                                    Volumen <SortIcon field="volume" sortBy={sortBy} sortDir={sortDir} />
                                </th>
                                <th>Datum isteka</th>
                                <th>Berza</th>
                                <th
                                    className="sec-th--sortable"
                                    onClick={() => handleSort("margin")}
                                    title="Sortiraj po margini"
                                >
                                    Margina <SortIcon field="margin" sortBy={sortBy} sortDir={sortDir} />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {processed.map(s => {
                                const positive = s.change >= 0;
                                // Spec p.45–46: clients may view stock and futures
                                // detail (graf, podaci, kupi). Forex stays
                                // employee-only — already filtered out of the
                                // client view above.
                                const clickable = s.type === "stock" || s.type === "futures" || (!isClient);
                                return (
                                    <tr
                                        key={s.ticker}
                                        className={clickable ? "sec-row--clickable" : ""}
                                        onClick={() => clickable && navigate(`/securities/${s.ticker}`)}
                                        title={clickable ? `Otvori detalje za ${s.ticker}` : undefined}
                                    >
                                        <td className="sec-ticker">{s.ticker}</td>
                                        <td className="sec-name">{s.name}</td>
                                        <td>
                                            <span className={`sec-badge sec-badge--${s.type}`}>
                                                {s.type === "stock" ? "Akcija" : s.type === "futures" ? "Futures" : "Forex"}
                                            </span>
                                        </td>
                                        <td className="sec-price">{fmt(s.price)}</td>
                                        <td className="sec-muted">{fmt(s.ask)}</td>
                                        <td className="sec-muted">{fmt(s.bid)}</td>
                                        <td className={positive ? "sec-positive" : "sec-negative"}>
                                            {formatChange(s.change)}
                                        </td>
                                        <td className="sec-muted">{s.volume.toLocaleString("sr-RS")}</td>
                                        <td className="sec-muted">
                                            {s.settlementDate
                                                ? new Date(s.settlementDate).toLocaleDateString("sr-RS")
                                                : "—"}
                                        </td>
                                        <td className="sec-muted">{s.exchange}</td>
                                        <td className="sec-muted">{fmt(s.maintenanceMargin)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="sec-count">
                        {processed.length} {processed.length === 1 ? "hartija" : "hartija"}
                    </div>
                </div>
            )}
        </div>
    );
}
