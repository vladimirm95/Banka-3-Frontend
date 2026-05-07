import api from "./api";

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
