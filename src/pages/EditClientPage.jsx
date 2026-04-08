import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { getClientById, updateClient } from "../services/ClientService";
import "./CreateClientPage.css";
import "./EmployeesPage.css";

function validate(form) {
    const errors = {};

    if (!form.firstName.trim()) errors.firstName = "Ime je obavezno.";
    if (!form.lastName.trim()) errors.lastName = "Prezime je obavezno.";
    if (!form.gender.trim()) errors.gender = "Pol je obavezan.";
    if (!form.address.trim()) errors.address = "Adresa je obavezna.";

    if (!form.phoneNumber.trim()) {
        errors.phoneNumber = "Broj telefona je obavezan.";
    } else if (!/^\+?[\d\s\-()]{7,20}$/.test(form.phoneNumber)) {
        errors.phoneNumber = "Unesite ispravan broj telefona.";
    }

    if (!form.dateOfBirth.trim()) {
        errors.dateOfBirth = "Datum rođenja je obavezan.";
    } else if (!/^\d{2}\.\d{2}\.\d{4}$/.test(form.dateOfBirth)) {
        errors.dateOfBirth = "Format: DD.MM.GGGG";
    }

    if (!form.email.trim()) {
        errors.email = "Email je obavezan.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = "Unesite ispravan email.";
    }

    return errors;
}

function formatDateForInput(value) {
    if (!value) return "";
    const d = new Date(typeof value === "number" ? value * 1000 : value);
    if (Number.isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

export default function EditClientPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        gender: "",
        email: "",
        phoneNumber: "",
        address: "",
        dateOfBirth: "",
    });

    const [errors, setErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadClient() {
            try {
                const client = await getClientById(id);

                if (!client) {
                    if (!cancelled) setNotFound(true);
                    return;
                }

                if (!cancelled) {
                    setForm({
                        firstName: client.firstName || "",
                        lastName: client.lastName || "",
                        gender: client.gender || "",
                        email: client.email || "",
                        phoneNumber: client.phone || "",
                        address: client.address || "",
                        dateOfBirth: formatDateForInput(client.dateOfBirth),
                    });
                }
            } catch {
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadClient();
        return () => {
            cancelled = true;
        };
    }, [id]);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSuccessMsg("");

        const validationErrors = validate(form);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setSaving(true);

        try {
            const [dd, mm, yyyy] = form.dateOfBirth.split(".");
            const formattedDate = `${yyyy}-${mm}-${dd}`;

            await updateClient(Number(id), {
                firstName: form.firstName,
                lastName: form.lastName,
                gender: form.gender,
                email: form.email,
                phoneNumber: form.phoneNumber,
                address: form.address,
                dateOfBirth: formattedDate,
            });

            setErrors({});
            setSuccessMsg("Podaci klijenta su uspešno izmenjeni.");
        } catch (err) {
            setErrors({
                submit: err.response?.data?.error || "Greška pri izmeni klijenta.",
            });
        } finally {
            setSaving(false);
        }
    }

    function field(label, name, type = "text", placeholder = "unesite...") {
        return (
            <div className="form-group">
                <label htmlFor={name}>{label}</label>
                <input
                    id={name}
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className={errors[name] ? "input-error" : ""}
                />
                {errors[name] && <span className="error-msg">{errors[name]}</span>}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page-bg">
                <Sidebar />
                <div className="create-page">
                    <div className="create-form-card">
                        <p>Učitavanje...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="page-bg">
                <Sidebar />
                <div className="create-page">
                    <div className="create-form-card">
                        <p className="submit-error">Klijent nije pronađen.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-bg">
            <Sidebar />

            <div className="create-page">
                <div className="create-form-card">
                    <div className="create-header">
                        <div className="create-header-text">
                            <p className="create-eyebrow">IZMENA KLIJENTA</p>
                            <h1>Izmeni klijenta</h1>
                            <p className="create-subtitle">
                                Ažuriranje ličnih podataka i kontakt informacija klijenta.
                            </p>
                        </div>

                        <div className="create-header-actions">
                            <button
                                type="button"
                                className="create-btn create-btn-secondary"
                                onClick={() => navigate(`/clients/${id}`)}
                            >
                                Nazad
                            </button>
                        </div>
                    </div>

                    {successMsg && <div className="success-msg">{successMsg}</div>}
                    {errors.submit && <div className="submit-error">{errors.submit}</div>}

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-row-three">
                            {field("Ime", "firstName")}
                            {field("Prezime", "lastName")}

                            <div className="form-group">
                                <label htmlFor="gender">Pol</label>
                                <select
                                    id="gender"
                                    name="gender"
                                    value={form.gender}
                                    onChange={handleChange}
                                    className={errors.gender ? "input-error" : ""}
                                >
                                    <option value="">Izaberite pol</option>
                                    <option value="M">Muški</option>
                                    <option value="F">Ženski</option>
                                </select>
                                {errors.gender && <span className="error-msg">{errors.gender}</span>}
                            </div>
                        </div>

                        <div className="form-grid">
                            {field("Email", "email", "email")}
                            {field("Broj telefona", "phoneNumber")}
                            {field("Adresa", "address")}
                            {field("Datum rođenja", "dateOfBirth", "text", "DD.MM.GGGG")}
                        </div>

                        <div className="form-actions">
                            <button
                                className="create-btn create-btn-primary"
                                type="submit"
                                disabled={saving}
                            >
                                {saving ? "Čuvanje..." : "Sačuvaj izmene"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}