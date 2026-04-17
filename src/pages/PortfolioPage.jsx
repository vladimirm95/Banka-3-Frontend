import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { formatCurrency } from "../utils/loanCalculations.js";
import "./PortfolioPage.css";

// TODO: Zameniti sa pravim API pozivom kada backend implementira endpoint
const MOCK_SECURITIES = [
    {
        id: 1,
        type: "Akcija",
        ticker: "AAPL",
        name: "Apple Inc.",
        quantity: 10,
        purchase_price: 15000,
        current_price: 17500,
        currency: "RSD",
    },
    {
        id: 2,
        type: "Akcija",
        ticker: "MSFT",
        name: "Microsoft Corp.",
        quantity: 5,
        purchase_price: 30000,
        current_price: 27000,
        currency: "RSD",
    },
    {
        id: 3,
        type: "Obveznica",
        ticker: "GOVT",
        name: "US Treasury Bond",
        quantity: 20,
        purchase_price: 10000,
        current_price: 10500,
        currency: "RSD",
    },
    {
        id: 4,
        type: "Akcija",
        ticker: "GOOGL",
        name: "Alphabet Inc.",
        quantity: 3,
        purchase_price: 12000,
        current_price: 11000,
        currency: "RSD",
    },
];

function fmt(amount, currency = "RSD") {
    return formatCurrency(amount / 100, currency);
}

function calcProfitLoss(security) {
    const { quantity, purchase_price, current_price } = security;
    return (current_price - purchase_price) * quantity;
}

function calcPositionValue(security) {
    return security.current_price * security.quantity;
}

export default function PortfolioPage() {
    const navigate = useNavigate();
    const [securities] = useState(MOCK_SECURITIES);

    const totalProfitLoss = securities.reduce(
        (sum, s) => sum + calcProfitLoss(s),
        0
    );

    const totalPortfolioValue = securities.reduce(
        (sum, s) => sum + calcPositionValue(s),
        0
    );

    const handleSell = (ticker) => {
        // TODO: Navigacija na create-order stranicu kada bude implementirana
        alert(`Prodaja hartije ${ticker} — funkcionalnost u razvoju.`);
    };

    return (
        <div className="portfolio-page">
            <Sidebar />

            <h1 className="portfolio-title">Moj portfolio</h1>

            {/* Summary kartice */}
            <div className="portfolio-summaries">
                <div
                    className={`portfolio-summary ${
                        totalProfitLoss >= 0 ? "summary--profit" : "summary--loss"
                    }`}
                >
                    <span className="summary-label">Ukupni profit/gubitak</span>
                    <span className="summary-value">
                        {totalProfitLoss >= 0 ? "+" : ""}
                        {fmt(totalProfitLoss)}
                    </span>
                </div>

                <div className="portfolio-summary summary--neutral">
                    <span className="summary-label">Ukupna vrednost portfolia</span>
                    <span className="summary-value summary-value--neutral">
                        {fmt(totalPortfolioValue)}
                    </span>
                </div>
            </div>

            {/* Tabela hartija */}
            {securities.length === 0 ? (
                <div className="portfolio-empty">
                    <p>Nemate hartija od vrednosti u portfoliju.</p>
                </div>
            ) : (
                <div className="portfolio-table-wrapper">
                    <table className="portfolio-table">
                        <thead>
                        <tr>
                            <th>Tip</th>
                            <th>Ticker</th>
                            <th>Naziv</th>
                            <th>Količina</th>
                            <th>Trenutna cena</th>
                            <th>Vrednost pozicije</th>
                            <th>Profit/Gubitak</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {securities.map((s) => {
                            const pl = calcProfitLoss(s);
                            const isProfit = pl >= 0;
                            const positionValue = calcPositionValue(s);
                            return (
                                <tr key={s.id}>
                                    <td>
                <span className="security-type-badge">
                    {s.type}
                </span>
                                    </td>
                                    <td className="ticker">{s.ticker}</td>
                                    <td className="security-name">{s.name}</td>
                                    <td>{s.quantity}</td>
                                    <td>{fmt(s.current_price, s.currency)}</td>
                                    <td className="position-value">
                                        {fmt(positionValue, s.currency)}
                                    </td>
                                    <td style={{ color: isProfit ? "#34d399" : "#f87171", fontWeight: 700 }}>
                                        {isProfit ? "+" : ""}
                                        {fmt(pl, s.currency)}
                                    </td>
                                    <td>
                                        <button
                                            className="sell-btn"
                                            onClick={() => handleSell(s.ticker)}
                                        >
                                            Sell
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}