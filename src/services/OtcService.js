import api from "./api";

// TODO: Zameniti sa pravim API pozivima kada backend implementira OTC endpointe

const MOCK_OFFERS = [
    {
        id: 1,
        ticker: "AAPL",
        quantity: 10,
        price_per_unit: 17500,
        total_price: 175000,
        currency: "RSD",
        seller: "Marko Marković",
        status: "pending",
        created_at: Date.now() / 1000 - 3600,
    },
    {
        id: 2,
        ticker: "MSFT",
        quantity: 5,
        price_per_unit: 27000,
        total_price: 135000,
        currency: "RSD",
        seller: "Jana Janić",
        status: "accepted",
        created_at: Date.now() / 1000 - 7200,
    },
    {
        id: 3,
        ticker: "GOOGL",
        quantity: 3,
        price_per_unit: 11000,
        total_price: 33000,
        currency: "RSD",
        seller: "Petar Petrović",
        status: "rejected",
        created_at: Date.now() / 1000 - 10800,
    },
    {
        id: 4,
        ticker: "GOVT",
        quantity: 20,
        price_per_unit: 10500,
        total_price: 210000,
        currency: "RSD",
        seller: "Ana Anić",
        status: "pending",
        created_at: Date.now() / 1000 - 1800,
    },
];

export async function listActiveOffers() {
    // TODO: return (await api.get("/otc/offers")).data;
    return MOCK_OFFERS;
}

export async function acceptOffer(offerId) {
    // TODO: return (await api.post(`/otc/offers/${offerId}/accept`)).data;
    return { success: true };
}

export async function rejectOffer(offerId) {
    // TODO: return (await api.post(`/otc/offers/${offerId}/reject`)).data;
    return { success: true };
}

export async function counterOffer(offerId, payload) {
    // TODO: return (await api.post(`/otc/offers/${offerId}/counter`, payload)).data;
    return { success: true };
}