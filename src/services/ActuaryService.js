import api from "./api";

// Backend za "Profit Banke" portal (issue #221, parent zatvorena bez
// implementacije; ne postoji endpoint za agregirani profit po aktuaru u
// services/gateway/internal/gateway/actuaries.go). Mock layer ispod
// definiše budući REST contract — kad backend stigne, postavi
// VITE_USE_ACTUARY_PROFIT_MOCK=false u .env.
const USE_PROFIT_MOCK =
    (import.meta.env?.VITE_USE_ACTUARY_PROFIT_MOCK ?? "true") !== "false";

const mockActuaryProfits = [
    { id: "1", first_name: "Milan",  last_name: "Milić",      profit_minor: 124_500_000 },
    { id: "2", first_name: "Ana",    last_name: "Anić",       profit_minor:  83_250_000 },
    { id: "3", first_name: "Stefan", last_name: "Stefanović", profit_minor: -12_030_000 },
    { id: "4", first_name: "Jovana", last_name: "Jovanović",  profit_minor: 200_175_000 },
    { id: "5", first_name: "Nikola", last_name: "Nikolić",    profit_minor:   5_240_000 },
    { id: "6", first_name: "Marija", last_name: "Marić",      profit_minor:  47_890_000 },
];

function mapActuaryProfit(d) {
    return {
        id: String(d.id ?? ""),
        firstName: d.first_name ?? d.firstName ?? "",
        lastName: d.last_name ?? d.lastName ?? "",
        profit: Number(d.profit_minor ?? d.profit ?? 0) / 100,
    };
}

export async function getActuaryProfits() {
    if (USE_PROFIT_MOCK) {
        await new Promise((r) => setTimeout(r, 120));
        return mockActuaryProfits.map(mapActuaryProfit);
    }
    const { data } = await api.get("/actuaries/profits");
    return (Array.isArray(data) ? data : []).map(mapActuaryProfit);
}

function mapActuary(d) {
    return {
        id: d.id,
        firstName: d.first_name ?? d.firstName ?? "",
        lastName: d.last_name ?? d.lastName ?? "",
        email: d.email ?? "",
        position: d.position ?? "",
        phone: d.phone ?? d.phone_number ?? "",
        active: d.active ?? true,
        limit: Number(d.limit ?? 0) / 100,
        usedLimit: Number(d.used_limit ?? d.usedLimit ?? 0) / 100,
        needApproval: d.need_approval ?? d.needApproval ?? false,
    };
}

export const ActuaryService = {
    async getAllAgents() {
        const { data } = await api.get("/actuaries");
        return (Array.isArray(data) ? data : []).map(mapActuary);
    },

    async updateAgentLimit(agentId, newLimitMajor) {
        const minor = Math.round(Number(newLimitMajor) * 100);
        const { data } = await api.patch(`/actuaries/${agentId}/limit`, { limit: minor });
        return mapActuary(data);
    },

    async resetUsedLimit(agentId) {
        const { data } = await api.post(`/actuaries/${agentId}/reset-used-limit`);
        return mapActuary(data);
    },

    // Flips agents.need_approval (review §S50). Backend endpoint already
    // existed; this just exposes it to the supervisor's actuary portal so
    // they can disable per-trade approval for trusted agents.
    async setNeedApproval(agentId, needApproval) {
        const { data } = await api.patch(`/actuaries/${agentId}/need-approval`, {
            need_approval: needApproval,
        });
        return mapActuary(data);
    },

    isSupervisorOrAdmin() {
        try {
            const permissions = JSON.parse(sessionStorage.getItem("permissions") || "[]");
            return permissions.includes("supervisor") || permissions.includes("admin");
        } catch {
            return false;
        }
    },
};
