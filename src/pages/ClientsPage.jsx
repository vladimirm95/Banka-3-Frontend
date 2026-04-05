import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { getClients } from "../services/ClientService";
import "./ClientsPage.css";

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(typeof value === "number" ? value * 1000 : value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("sr-RS");
}

export default function ClientsPage() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterGender, setFilterGender] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 15;

    useEffect(() => {
        let cancelled = false;

        async function loadClients() {
            try {
                const data = await getClients();
                if (!cancelled) setClients(data);
            } catch {
                if (!cancelled) setError("Greška pri učitavanju klijenata.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadClients();

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredClients = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return clients.filter((client) => {
            const matchesSearch =
                !term ||
                `${client.firstName || ""} ${client.lastName || ""}`.toLowerCase().includes(term) ||
                (client.email || "").toLowerCase().includes(term) ||
                (client.phone || "").toLowerCase().includes(term) ||
                String(client.id || "").includes(term);

            const matchesGender = !filterGender || client.gender === filterGender;

            return matchesSearch && matchesGender;
        });
    }, [clients, searchTerm, filterGender]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterGender]);

    const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const paginatedClients = filteredClients.slice(startIndex, startIndex + PAGE_SIZE);

    if (loading) {
        return (
            <div className="page-bg">
                <img src="/bank-logo.png" alt="logo" className="bank-logo" />
                <Sidebar />
                <div className="content-wrapper"><p>Učitavanje...</p></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-bg">
                <img src="/bank-logo.png" alt="logo" className="bank-logo" />
                <Sidebar />
                <div className="content-wrapper"><p style={{ color: "#f87171" }}>{error}</p></div>
            </div>
        );
    }

    return (
        <div className="page-bg">
            <img src="/bank-logo.png" alt="logo" className="bank-logo" />
            <Sidebar />

            <div className="content-wrapper">
                <div className="employee-card client-card-shell">
                    <div className="employee-topbar">
                        <div className="employee-title-block">
                            <p className="employee-eyebrow">UPRAVLJANJE KLIJENTIMA</p>
                            <h1>Klijenti</h1>
                            <p className="employee-subtitle">
                                Pregled, pretraga i otvaranje detalja klijenata banke.
                            </p>
                        </div>

                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <button
                                type="button"
                                className="create-btn create-btn-secondary"
                                onClick={() => navigate("/employees")}
                            >
                                Nazad
                            </button>

                            <button
                                type="button"
                                className="client-create-btn"
                                onClick={() => navigate("/clients/create")}
                            >
                                + Kreiraj klijenta
                            </button>
                        </div>
                    </div>

                    <div className="employee-toolbar">
                        <div className="toolbar-row">
                            <div className="search-wrapper">
                                <span className="search-icon">⌕</span>
                                <input
                                    className="search"
                                    placeholder="Pretraga po imenu, email-u, telefonu ili ID-u"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="toolbar-actions">
                            <select
                                className="position-filter"
                                value={filterGender}
                                onChange={(e) => setFilterGender(e.target.value)}
                            >
                                <option value="">Svi polovi</option>
                                <option value="M">Muški</option>
                                <option value="F">Ženski</option>
                            </select>

                            <button
                                className="reset-btn"
                                onClick={() => {
                                    setSearchTerm("");
                                    setFilterGender("");
                                }}
                            >
                                Reset filtera
                            </button>
                        </div>
                    </div>

                    <div className="filter-info">
                        Pronađeno: <strong>{filteredClients.length}</strong> / {clients.length} klijenata
                    </div>

                    <div className="table-container client-table-wrap">
                        <table className="client-table">
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Ime i prezime</th>
                                <th>Email</th>
                                <th>Telefon</th>
                                <th>Pol</th>
                                <th>Datum rođenja</th>
                            </tr>
                            </thead>
                            <tbody>
                            {paginatedClients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="client-empty-state">
                                        Nema rezultata za zadate kriterijume.
                                    </td>
                                </tr>
                            ) : (
                                paginatedClients.map((client) => (
                                    <tr
                                        key={client.id}
                                        className="client-row"
                                        onClick={() => navigate(`/clients/${client.id}`)}
                                    >
                                        <td>{client.id}</td>
                                        <td>{client.firstName} {client.lastName}</td>
                                        <td>{client.email || "—"}</td>
                                        <td>{client.phone || "—"}</td>
                                        <td>
                                            {client.gender === "M"
                                                ? "Muški"
                                                : client.gender === "F"
                                                    ? "Ženski"
                                                    : "—"}
                                        </td>
                                        <td>{formatDate(client.dateOfBirth)}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                            Prethodna
                        </button>
                        <span>Strana {currentPage} / {totalPages || 1}</span>
                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage((p) => p + 1)}
                        >
                            Sledeća
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}