const USE_MOCK = true;

const MOCK_PORTFOLIO = [
    {
        id: 1,
        type: "Akcija",
        ticker: "AAPL",
        quantity: 10,
        currentPrice: 215.4,
        purchasePrice: 180.0,
    },
    {
        id: 2,
        type: "Akcija",
        ticker: "TSLA",
        quantity: 4,
        currentPrice: 168.2,
        purchasePrice: 195.0,
    },
    {
        id: 3,
        type: "ETF",
        ticker: "SPY",
        quantity: 7,
        currentPrice: 510.75,
        purchasePrice: 472.1,
    },
];

export async function getPortfolio() {
    if (USE_MOCK) {
        return Promise.resolve(MOCK_PORTFOLIO);
    }

    return [];
}