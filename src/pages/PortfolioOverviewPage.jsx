import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPortfolio } from "../services/PortfolioService";
import "./PortfolioOverviewPage.css";

export default function PortfolioOverviewPage() {
    useNavigate();
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadPortfolio() {
            try {
                setLoading(true);
                const data = await getPortfolio();
                setPortfolio(data);
            } catch (err) {
                console.error("Greška pri učitavanju portfolija:", err);
            } finally {
                setLoading(false);
            }
        }

        loadPortfolio();
    }, []);

    // računanje profita po hartiji
    const portfolioWithProfit = useMemo(() => {
        return portfolio.map((item) => {
            const profit =
                (item.currentPrice - item.purchasePrice) * item.quantity;

            return {
                ...item,
                profit,
            };
        });
    }, [portfolio]);

    // ukupni profit
    const totalProfit = useMemo(() => {
        return portfolioWithProfit.reduce(
            (sum, item) => sum + item.profit,
            0
        );
    }, [portfolioWithProfit]);

    // loading state
    if (loading) {
        return (
            <div className="portfolio-page">
                <p>Učitavanje portfolija...</p>
            </div>
        );
    }

    return (
        <div className="portfolio-page">
            <div className="portfolio-header">
                <h1>Portfolio</h1>
                <p>Pregled hartija od vrednosti koje korisnik poseduje.</p>
            </div>

            {/* SUMMARY */}
            <div className="portfolio-summary-card">
                <span>Ukupan profit / gubitak</span>
                <h2
                    className={
                        totalProfit >= 0
                            ? "profit-positive"
                            : "profit-negative"
                    }
                >
                    {totalProfit >= 0 ? "+" : "-"}
                    {Math.abs(totalProfit).toLocaleString("sr-RS", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}{" "}
                    RSD
                </h2>

                <p className="portfolio-result-label">
                    {totalProfit >= 0
                        ? "Portfolio je trenutno u profitu"
                        : "Portfolio je trenutno u gubitku"}
                </p>
            </div>

            {/* TABLE */}
            <div className="portfolio-table-wrapper">
                {portfolioWithProfit.length === 0 ? (
                    <div className="portfolio-empty-state">
                        Korisnik trenutno nema hartije od vrednosti.
                    </div>
                ) : (
                    <table className="portfolio-table">
                        <thead>
                        <tr>
                            <th>Tip hartije</th>
                            <th>Ticker</th>
                            <th>Količina</th>
                            <th>Trenutna cena</th>
                            <th>Profit / gubitak</th>
                            <th>Akcija</th>
                        </tr>
                        </thead>

                        <tbody>
                        {portfolioWithProfit.map((item) => (
                            <tr key={item.id}>
                                <td>{item.type}</td>
                                <td>{item.ticker}</td>
                                <td>{item.quantity}</td>

                                <td>
                                    {item.currentPrice.toLocaleString(
                                        "sr-RS",
                                        {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }
                                    )}{" "}
                                    RSD
                                </td>

                                <td
                                    className={
                                        item.profit >= 0
                                            ? "profit-positive"
                                            : "profit-negative"
                                    }
                                >
                                    {item.profit >= 0 ? "+" : "-"}
                                    {Math.abs(item.profit).toLocaleString(
                                        "sr-RS",
                                        {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }
                                    )}{" "}
                                    RSD
                                </td>

                                <td>
                                    <button
                                        className="portfolio-sell-button"
                                        onClick={() =>
                                            alert(
                                                `dodati kako se vec zove putanja`
                                            )
                                            //onClick={() => navigate("/create-order")}
                                        }
                                    >
                                        Sell
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}