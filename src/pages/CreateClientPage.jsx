import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { createClient } from "../services/ClientService";
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

    if (!form.password.trim()) {
        errors.password = "Lozinka je obavezna.";
    } else if (form.password.length < 8) {
        errors.password = "Lozinka mora imati najmanje 8 karaktera.";
    }

    if (!form.confirmPassword.trim()) {
        errors.confirmPassword = "Potvrda lozinke je obavezna.";
    } else if (form.password !== form.confirmPassword) {
        errors.confirmPassword = "Lozinke se ne poklapaju.";
    }

    return errors;
}

const EMPTY = {
    firstName: "",
    lastName: "",
    gender: "",
    email: "",
    phoneNumber: "",
    address: "",
    dateOfBirth: "",
    password: "",
    confirmPassword: "",
};

export default function CreateClientPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState("");
    const [loading, setLoading] = useState(false);

    function handleChange(e) {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
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

        setLoading(true);

        try {
            const [dd, mm, yyyy] = form.dateOfBirth.split(".");
            const formattedDate = `${yyyy}-${mm}-${dd}`;

            await createClient({
                firstName: form.firstName,
                lastName: form.lastName,
                gender: form.gender,
                email: form.email,
                phoneNumber: form.phoneNumber,
                address: form.address,
                dateOfBirth: formattedDate,
                password: form.password,
            });

            setSuccessMsg("Klijent je uspešno kreiran.");
            setErrors({});
            setForm(EMPTY);

            setTimeout(() => {
                navigate("/clients");
            }, 900);
        } catch (err) {
            setErrors({
                submit: err.response?.data?.error || "Greška pri kreiranju klijenta.",
            });
        } finally {
            setLoading(false);
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

    return (
        <div className="page-bg">
            <Sidebar />

            <div className="create-page">
                <div className="create-form-card">
                    <div className="create-header">
                        <div className="create-header-text">
                            <p className="create-eyebrow">KREIRANJE KLIJENTA</p>
                            <h1>Kreiraj novog klijenta</h1>
                            <p className="create-subtitle">
                                Unesite osnovne lične i kontakt podatke klijenta nezavisno od otvaranja računa.
                            </p>
                        </div>

                        <div className="create-header-actions">
                            <button
                                type="button"
                                className="create-btn create-btn-secondary"
                                onClick={() => navigate("/clients")}
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
                            {field("Lozinka", "password", "password")}
                            {field("Potvrda lozinke", "confirmPassword", "password")}
                        </div>

                        <div className="form-actions">
                            <button
                                className="create-btn create-btn-primary"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Slanje..." : "Potvrdi"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}