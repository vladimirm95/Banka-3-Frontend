import { useState,useEffect  } from "react";
import { useNavigate } from "react-router-dom";
import { createAccount } from "../services/AccountService";
import Sidebar from "../components/Sidebar.jsx";
import "./CreateAccountPage.css";
import { getClients, getClientByEmail, createClient } from "../services/ClientService";



const ACCOUNT_TYPES = [
    {
        value: "TEKUCI",
        label: "Tekući račun",
        desc: "Račun za svakodnevne transakcije u dinarima",
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
        ),
    },
    {
        value: "DEVIZNI",
        label: "Devizni račun",
        desc: "Račun za transakcije u stranoj valuti",
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
        ),
    },
];

const FOREIGN_CURRENCIES = [
    { value: "EUR", label: "Euro", flag: "🇪🇺" },
    { value: "USD", label: "Američki dolar", flag: "🇺🇸" },
    { value: "CHF", label: "Švajcarski franak", flag: "🇨🇭" },
    { value: "GBP", label: "Britanska funta", flag: "🇬🇧" },
    { value: "JPY", label: "Japanski jen", flag: "🇯🇵" },
    { value: "CAD", label: "Kanadski dolar", flag: "🇨🇦" },
    { value: "AUD", label: "Australijski dolar", flag: "🇦🇺" },
];

const OWNER_TYPES = [
    {
        value: "PERSONAL",
        label: "Fizičko lice",
        desc: "Račun otvoren na vaše ime",
        icon: (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        ),
    },
    {
        value: "BUSINESS",
        label: "Pravno lice",
        desc: "Račun otvoren na ime kompanije",
        icon: (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <line x1="12" y1="12" x2="12" y2="16" />
                <line x1="10" y1="14" x2="14" y2="14" />
            </svg>
        ),
    },
];

const EMPTY_COMPANY = {
    name: "",
    pib: "",
    registration_number: "",
    activity_code: "",
    address: "",
};
const EMPTY_CLIENT = {
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    gender: "",
    dateOfBirth: "",
    password: "",
};

const PERSONAL_SUBTYPES = [
    { value: "standardni", label: "Standardni" },
    { value: "stedni", label: "Štedni" },
    { value: "penzionerski", label: "Penzionerski" },
    { value: "studentski", label: "Studentski" },
    { value: "za_nezaposlene", label: "Za nezaposlene" },
    { value: "za_mlade", label: "Za mlade" },
];

const COMPANY_SUBTYPES = [
    { value: "DOO", label: "D.O.O.", desc: "Društvo sa ograničenom odgovornošću" },
    { value: "AD", label: "A.D.", desc: "Akcionarsko društvo" },
];

function validate(type, currency, ownerType, subtype, companySubtype, clientId, initialBalance, company) {
    const errors = {};

    if (!type) errors.type = "Izaberite tip računa.";
    if (!clientId) errors.client = "Izaberite klijenta.";
    if (type === "DEVIZNI" && !currency) errors.currency = "Izaberite valutu.";
    if (!ownerType) errors.ownerType = "Izaberite tip vlasnika.";
    if (ownerType === "PERSONAL" && !subtype) errors.subtype = "Izaberite podtip računa.";
    if (ownerType === "BUSINESS" && !companySubtype) {
        errors.companySubtype = "Izaberite tip kompanije.";
    }

    if (initialBalance === "" || Number(initialBalance) < 0) {
        errors.initialBalance = "Unesite početno stanje.";
    }

    if (ownerType === "BUSINESS") {
        if (!company.name.trim()) errors.companyName = "Naziv kompanije je obavezan.";
        if (!company.pib.trim()) errors.pib = "PIB je obavezan.";
        if (!company.registration_number.trim()) errors.registration_number = "Matični broj je obavezan.";
        if (!company.activity_code.trim()) errors.activity_code = "Šifra delatnosti je obavezna.";
        if (!company.address.trim()) errors.companyAddress = "Adresa kompanije je obavezna.";
    }

    return errors;
}
export default function CreateAccountPage() {
    const navigate = useNavigate();

    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState("");


    const [accountType, setAccountType] = useState("");
    const [currency, setCurrency] = useState("");
    const [ownerType, setOwnerType] = useState("");
    const [subtype, setSubtype] = useState("");
    const [company, setCompany] = useState(EMPTY_COMPANY);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [dailyLimit, setDailyLimit] = useState("");
    const [monthlyLimit, setMonthlyLimit] = useState("");
    const [createCard, setCreateCard] = useState(false);
    const [companySubtype, setCompanySubtype] = useState("");
    const [success, setSuccess] = useState(false);
    const [initialBalance, setInitialBalance] = useState("");
    const [accountName, setAccountName] = useState("");
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientForm, setClientForm] = useState(EMPTY_CLIENT);
    const [clientFormErrors, setClientFormErrors] = useState({});
    const [clientSubmitting, setClientSubmitting] = useState(false);



    useEffect(() => {
        async function fetchClients() {
            try {
                const data = await getClients();
                setClients(data);
            } catch (err) {
                console.error("Greška pri učitavanju klijenata:", err);
            }
        }
        fetchClients();
    }, []);

    function resetClientForm() {
        setClientForm(EMPTY_CLIENT);
        setClientFormErrors({});
    }

    function openClientModal() {
        resetClientForm();
        setIsClientModalOpen(true);
    }

    function closeClientModal() {
        if (clientSubmitting) return;
        setIsClientModalOpen(false);
        resetClientForm();
    }

    function handleClientFormChange(e) {
        const { name, value } = e.target;
        setClientForm((prev) => ({ ...prev, [name]: value }));

        if (clientFormErrors[name]) {
            setClientFormErrors((prev) => ({ ...prev, [name]: "" }));
        }
    }

    function validateClientForm() {
        const errs = {};

        if (!clientForm.firstName.trim()) errs.firstName = "Ime je obavezno.";
        if (!clientForm.lastName.trim()) errs.lastName = "Prezime je obavezno.";
        if (!clientForm.email.trim()) errs.email = "Email je obavezan.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientForm.email)) errs.email = "Unesite ispravan email.";
        if (!clientForm.phoneNumber.trim()) errs.phoneNumber = "Broj telefona je obavezan.";
        if (!clientForm.address.trim()) errs.address = "Adresa je obavezna.";
        if (!clientForm.gender.trim()) errs.gender = "Pol je obavezan.";
        if (!clientForm.dateOfBirth.trim()) errs.dateOfBirth = "Datum rođenja je obavezan.";
        if (!clientForm.password.trim()) errs.password = "Privremena lozinka je obavezna.";

        return errs;
    }

    async function handleCreateClient(e) {
        e.preventDefault();

        const errs = validateClientForm();
        if (Object.keys(errs).length > 0) {
            setClientFormErrors(errs);
            return;
        }

        try {
            setClientSubmitting(true);

            await createClient(clientForm);

            const freshClients = await getClients();
            setClients(freshClients);

            const createdClient = await getClientByEmail(clientForm.email);

            if (createdClient?.id) {
                setSelectedClientId(String(createdClient.id));
                setErrors((prev) => ({ ...prev, client: "" }));
            }

            closeClientModal();
        } catch (err) {
            setClientFormErrors({
                submit: err?.response?.data?.error || "Greška pri kreiranju klijenta.",
            });
        } finally {
            setClientSubmitting(false);
        }
    }

    function handleTypeSelect(value) {
        setAccountType(value);
        setCurrency(value === "TEKUCI" ? "RSD" : "");
        setErrors((prev) => ({ ...prev, type: "" }));
    }

    function handleCurrencySelect(value) {
        setCurrency(value);
        setErrors((prev) => ({ ...prev, currency: "" }));
    }

    function handleOwnerTypeSelect(value) {
        setOwnerType(value);
        setSubtype("");
        setCompanySubtype("");
        if (value === "PERSONAL") setCompany(EMPTY_COMPANY);
        setErrors((prev) => ({ ...prev, ownerType: "", subtype: "", companyName: "", pib: "", registration_number: "", activity_code: "", companyAddress: "" }));
    }

    function handleCompanyChange(e) {
        const { name, value } = e.target;
        setCompany((prev) => ({ ...prev, [name]: value }));
        const errorKey = name === "name" ? "companyName" : name === "address" ? "companyAddress" : name;
        setErrors((prev) => ({ ...prev, [errorKey]: "" }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError("");


        const errs = validate(accountType, currency, ownerType, subtype, companySubtype, selectedClientId,initialBalance,
            company);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }


        try {
            setSubmitting(true);
            const userId = selectedClientId;
            if (!userId) {
                setSubmitError("Morate izabrati klijenta.");
                return;
            }
            await createAccount({
                client_id: Number(userId),
                name: accountName.trim() || undefined,
                account_type: accountType,
                subtype: ownerType === "BUSINESS" ? companySubtype : subtype,
                currency,
                initial_balance: Number(initialBalance),
                daily_limit: dailyLimit ? Number(dailyLimit) : 0,
                monthly_limit: monthlyLimit ? Number(monthlyLimit) : 0,
                create_card: createCard,
                business_info: ownerType === "BUSINESS" ? {
                    company_name: company.name,
                    registration_number: company.registration_number,
                    pib: company.pib,
                    activity_code: company.activity_code,
                    address: company.address,
                } : undefined,
            });
            setSuccess(true);
        } catch (err) {
            setSubmitError(err.message || "Greška pri kreiranju računa.");
        } finally {
            setSubmitting(false);
        }
    }

    const readyForSummary = accountType && currency && ownerType &&
        (ownerType === "BUSINESS" || subtype);

    if (success) {
        return (
            <div className="ca-shell">
                <Sidebar />
                <div className="ca-content">
                    <div className="ca-success-box">
                        <h2>✅ Račun uspešno kreiran</h2>
                        <p>Račun je dodat u sistem.</p>

                        <div className="ca-actions">
                            <button
                                className="ca-btn-back"
                                onClick={() => navigate("/admin/accounts")}
                            >
                                Nazad na dashboard
                            </button>

                            <button
                                className="ca-btn-submit"
                                onClick={() => {
                                    setSuccess(false);
                                    // reset forme ako hoćeš
                                    setSelectedClientId("");
                                    setAccountType("");
                                    setCurrency("");
                                    setOwnerType("");
                                    setSubtype("");
                                    setCompany(EMPTY_COMPANY);
                                    setInitialBalance("");
                                    setAccountName("");
                                    setCreateCard(false);
                                    setDailyLimit("");
                                    setMonthlyLimit("");
                                    setCompanySubtype("");
                                    resetClientForm();
                                }}
                            >
                                Kreiraj još jedan račun
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (

        <div className="ca-shell">
            <Sidebar/>
            <div className="ca-content">

                {/* Header */}
                <div className="ca-header">
                    <button className="ca-back-btn" onClick={() => navigate("/admin/accounts")}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <div>
                        <p className="ca-subtitle">Novi račun</p>
                        <h1 className="ca-title">Otvaranje računa</h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} noValidate>

                    <div className="ca-section">
                        <div className="ca-section-headline">
                            <p className="ca-section-label">Klijent</p>
                            <button
                                type="button"
                                className="ca-link-btn"
                                onClick={openClientModal}
                            >
                                + Kreiraj novog klijenta
                            </button>
                        </div>

                        <select
                            className={`ca-input ${errors.client ? "ca-input--error" : ""}`}
                            value={selectedClientId}
                            onChange={(e) => {
                                setSelectedClientId(e.target.value);
                                setErrors((prev) => ({ ...prev, client: "" }));
                            }}
                        >
                            <option value="">Izaberite klijenta</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.firstName} {c.lastName} ({c.email})
                                </option>
                            ))}
                        </select>

                        {errors.client && <p className="ca-error">{errors.client}</p>}
                    </div>

                    {/* ── Account type ── */}
                    <div className="ca-section">
                        <p className="ca-section-label">Tip računa</p>
                        <div className="ca-type-grid">
                            {ACCOUNT_TYPES.map(({ value, label, desc, icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={`ca-type-card ${accountType === value ? "ca-type-card--selected" : ""}`}
                                    onClick={() => handleTypeSelect(value)}
                                >
                                    <div className="ca-type-icon">{icon}</div>
                                    <p className="ca-type-label">{label}</p>
                                    <p className="ca-type-desc">{desc}</p>
                                    {accountType === value && (
                                        <div className="ca-type-check">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        {errors.type && <p className="ca-error">{errors.type}</p>}
                    </div>

                    {/* ── Currency ── */}
                    {accountType === "TEKUCI" && (
                        <div className="ca-section">
                            <p className="ca-section-label">Valuta</p>
                            <div className="ca-currency-locked">
                                <span>🇷🇸</span>
                                <span>RSD — Srpski dinar</span>
                                <span className="ca-currency-locked-badge">Fiksno</span>
                            </div>
                        </div>
                    )}

                    {accountType === "DEVIZNI" && (
                        <div className="ca-section">
                            <p className="ca-section-label">Valuta</p>
                            <div className="ca-currency-grid">
                                {FOREIGN_CURRENCIES.map(({ value, label, flag }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={`ca-currency-btn ${currency === value ? "ca-currency-btn--selected" : ""}`}
                                        onClick={() => handleCurrencySelect(value)}
                                    >
                                        <span className="ca-currency-flag">{flag}</span>
                                        <span className="ca-currency-code">{value}</span>
                                        <span className="ca-currency-name">{label}</span>
                                    </button>
                                ))}
                            </div>
                            {errors.currency && <p className="ca-error">{errors.currency}</p>}
                        </div>
                    )}

                    {/* ── Owner type ── */}
                    {accountType && currency && (
                        <div className="ca-section">
                            <p className="ca-section-label">Vlasnik računa</p>
                            <div className="ca-type-grid">
                                {OWNER_TYPES.map(({ value, label, desc, icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={`ca-type-card ${ownerType === value ? "ca-type-card--selected" : ""}`}
                                        onClick={() => handleOwnerTypeSelect(value)}
                                    >
                                        <div className="ca-type-icon">{icon}</div>
                                        <p className="ca-type-label">{label}</p>
                                        <p className="ca-type-desc">{desc}</p>
                                        {ownerType === value && (
                                            <div className="ca-type-check">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {errors.ownerType && <p className="ca-error">{errors.ownerType}</p>}
                        </div>
                    )}

                    {/* ── Personal subtype ── */}
                    {ownerType === "PERSONAL" && (
                        <div className="ca-section">
                            <p className="ca-section-label">Podtip računa</p>
                            <div className="ca-currency-grid">
                                {PERSONAL_SUBTYPES.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={`ca-currency-btn ${subtype === value ? "ca-currency-btn--selected" : ""}`}
                                        onClick={() => {
                                            setSubtype(value);
                                            setErrors((prev) => ({ ...prev, subtype: "" }));
                                        }}
                                    >
                                        <span className="ca-currency-code">{label}</span>
                                    </button>
                                ))}
                            </div>
                            {errors.subtype && <p className="ca-error">{errors.subtype}</p>}
                        </div>
                    )}

                    {/* ── Company info ── */}
                    {ownerType === "BUSINESS" && (
                        <div className="ca-section">
                            <p className="ca-section-label">Podaci o kompaniji</p>
                            <div className="ca-company-form">

                                <div className="ca-field">
                                    <label className="ca-field-label">Tip kompanije</label>
                                    <div className="ca-currency-grid">
                                        {COMPANY_SUBTYPES.map(({value, label, desc}) => (
                                            <button
                                                key={value}
                                                type="button"
                                                className={`ca-currency-btn ${companySubtype === value ? "ca-currency-btn--selected" : ""}`}
                                                onClick={() => {
                                                    setCompanySubtype(value);
                                                    setErrors((prev) => ({...prev, companySubtype: ""}));
                                                }}
                                            >
                                                <span className="ca-currency-code">{label}</span>
                                                <span className="ca-currency-name">{desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {errors.companySubtype && <p className="ca-error">{errors.companySubtype}</p>}
                                </div>

                                <div className="ca-field">
                                    <label className="ca-field-label">Naziv kompanije</label>
                                    <input
                                        className={`ca-input ${errors.companyName ? "ca-input--error" : ""}`}
                                        name="name"
                                        value={company.name}
                                        onChange={handleCompanyChange}
                                        placeholder="npr. Acme d.o.o."
                                    />
                                    {errors.companyName && <p className="ca-error">{errors.companyName}</p>}
                                </div>

                                <div className="ca-field-row">
                                    <div className="ca-field">
                                        <label className="ca-field-label">PIB</label>
                                        <input
                                            className={`ca-input ${errors.pib ? "ca-input--error" : ""}`}
                                            name="pib"
                                            value={company.pib}
                                            onChange={handleCompanyChange}
                                            placeholder="9 cifara"
                                            maxLength={9}
                                        />
                                        {errors.pib && <p className="ca-error">{errors.pib}</p>}
                                    </div>

                                    <div className="ca-field">
                                        <label className="ca-field-label">Matični broj</label>
                                        <input
                                            className={`ca-input ${errors.registration_number ? "ca-input--error" : ""}`}
                                            name="registration_number"
                                            value={company.registration_number}
                                            onChange={handleCompanyChange}
                                            placeholder="8 cifara"
                                            maxLength={8}
                                        />
                                        {errors.registration_number &&
                                            <p className="ca-error">{errors.registration_number}</p>}
                                    </div>
                                </div>

                                <div className="ca-field">
                                    <label className="ca-field-label">Šifra delatnosti</label>
                                    <input
                                        className={`ca-input ${errors.activity_code ? "ca-input--error" : ""}`}
                                        name="activity_code"
                                        value={company.activity_code}
                                        onChange={handleCompanyChange}
                                        placeholder="npr. 10.1"
                                    />
                                    {errors.activity_code && <p className="ca-error">{errors.activity_code}</p>}
                                </div>

                                <div className="ca-field">
                                    <label className="ca-field-label">Adresa kompanije</label>
                                    <input
                                        className={`ca-input ${errors.companyAddress ? "ca-input--error" : ""}`}
                                        name="address"
                                        value={company.address}
                                        onChange={handleCompanyChange}
                                        placeholder="Ulica i broj, grad"
                                    />
                                    {errors.companyAddress && <p className="ca-error">{errors.companyAddress}</p>}
                                </div>

                            </div>
                        </div>
                    )}
                    <div className="ca-section">
                        <p className="ca-section-label">Naziv računa</p>
                        <div className="ca-field">
                            <label className="ca-field-label">Naziv (opciono)</label>
                            <input
                                className="ca-input"
                                type="text"
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                placeholder="npr. Moj tekući račun"
                            />
                        </div>
                    </div>

                    <div className="ca-section">
                        <p className="ca-section-label">Početno stanje</p>
                        <div className="ca-field">
                            <label className="ca-field-label">
                                Iznos ({currency || "RSD"})
                            </label>
                            <input
                                className={`ca-input ${errors.initialBalance ? "ca-input--error" : ""}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={initialBalance}
                                onChange={(e) => {
                                    setInitialBalance(e.target.value);
                                    setErrors((prev) => ({ ...prev, initialBalance: "" }));
                                }}
                                placeholder="0.00"
                            />
                            {errors.initialBalance && <p className="ca-error">{errors.initialBalance}</p>}
                        </div>
                    </div>

                    {/* ── Limits & card ── */}
                    {ownerType && (
                        <div className="ca-section">
                            <p className="ca-section-label">Podešavanja računa</p>

                            <div className="ca-field-row" style={{marginBottom: 12}}>
                                <div className="ca-field">
                                    <label className="ca-field-label">Dnevni limit (RSD)</label>
                                    <input
                                        className="ca-input"
                                        type="number"
                                        min="0"
                                        value={dailyLimit}
                                        onChange={(e) => setDailyLimit(e.target.value)}
                                        placeholder="0 = bez limita"
                                    />
                                </div>
                                <div className="ca-field">
                                    <label className="ca-field-label">Mesečni limit (RSD)</label>
                                    <input
                                        className="ca-input"
                                        type="number"
                                        min="0"
                                        value={monthlyLimit}
                                        onChange={(e) => setMonthlyLimit(e.target.value)}
                                        placeholder="0 = bez limita"
                                    />
                                </div>
                            </div>

                            <div className="ca-card-toggle">
                                <div>
                                    <p className="ca-card-toggle-label">Kreiraj karticu</p>
                                    <p className="ca-card-toggle-desc">Automatski kreira debitnu karticu uz ovaj račun</p>
                                </div>
                                <button
                                    type="button"
                                    className={`ca-toggle ${createCard ? "ca-toggle--on" : ""}`}
                                    onClick={() => setCreateCard((prev) => !prev)}
                                    aria-pressed={createCard}
                                >
                                    <span className="ca-toggle-knob" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Summary ── */}
                    {readyForSummary && (
                        <div className="ca-summary">
                            <p className="ca-summary-label">Pregled</p>
                            <div className="ca-summary-row">
                                <span>Tip računa</span>
                                <span>{ACCOUNT_TYPES.find(t => t.value === accountType)?.label}</span>
                            </div>
                            <div className="ca-summary-row">
                                <span>Valuta</span>
                                <span>{currency}</span>
                            </div>
                            <div className="ca-summary-row">
                                <span>Vlasnik</span>
                                <span>{ownerType === "PERSONAL" ? "Fizičko lice" : company.name || "Pravno lice"}</span>
                            </div>
                            {ownerType === "PERSONAL" && subtype && (
                                <div className="ca-summary-row">
                                    <span>Podtip</span>
                                    <span>{PERSONAL_SUBTYPES.find(s => s.value === subtype)?.label}</span>
                                </div>
                            )}
                            {ownerType === "BUSINESS" && companySubtype && (
                                <div className="ca-summary-row">
                                    <span>Tip kompanije</span>
                                    <span>{companySubtype}</span>
                                </div>
                            )}
                            <div className="ca-summary-row">
                                <span>Dnevni limit</span>
                                <span>{dailyLimit ? `${Number(dailyLimit).toLocaleString()} RSD` : "Bez limita"}</span>
                            </div>
                            <div className="ca-summary-row">
                                <span>Mesečni limit</span>
                                <span>{monthlyLimit ? `${Number(monthlyLimit).toLocaleString()} RSD` : "Bez limita"}</span>
                            </div>
                            <div className="ca-summary-row">
                                <span>Kartica</span>
                                <span>{createCard ? "Da" : "Ne"}</span>
                            </div>
                        </div>
                    )}

                    {submitError && <p className="ca-error ca-error--submit">{submitError}</p>}

                    <div className="ca-actions">
                        <button type="button" className="ca-btn-back" onClick={() => navigate("/dashboard")}>
                            Otkaži
                        </button>
                        <button type="submit" className="ca-btn-submit" disabled={submitting}>
                            {submitting ? "Kreiranje..." : "Otvori račun"}
                        </button>
                    </div>

                </form>
                {isClientModalOpen && (
                    <div className="ca-modal-overlay" onClick={closeClientModal}>
                        <div className="ca-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="ca-modal-header">
                                <div>
                                    <p className="ca-subtitle">Novi klijent</p>
                                    <h2 className="ca-modal-title">Kreiranje klijenta</h2>
                                </div>
                                <button
                                    type="button"
                                    className="ca-modal-close"
                                    onClick={closeClientModal}
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleCreateClient} className="ca-company-form" noValidate>
                                <div className="ca-field-row">
                                    <div className="ca-field">
                                        <label className="ca-field-label">Ime</label>
                                        <input
                                            className={`ca-input ${clientFormErrors.firstName ? "ca-input--error" : ""}`}
                                            name="firstName"
                                            value={clientForm.firstName}
                                            onChange={handleClientFormChange}
                                            placeholder="Ime"
                                        />
                                        {clientFormErrors.firstName && <p className="ca-error">{clientFormErrors.firstName}</p>}
                                    </div>

                                    <div className="ca-field">
                                        <label className="ca-field-label">Prezime</label>
                                        <input
                                            className={`ca-input ${clientFormErrors.lastName ? "ca-input--error" : ""}`}
                                            name="lastName"
                                            value={clientForm.lastName}
                                            onChange={handleClientFormChange}
                                            placeholder="Prezime"
                                        />
                                        {clientFormErrors.lastName && <p className="ca-error">{clientFormErrors.lastName}</p>}
                                    </div>
                                </div>

                                <div className="ca-field-row">
                                    <div className="ca-field">
                                        <label className="ca-field-label">Email</label>
                                        <input
                                            className={`ca-input ${clientFormErrors.email ? "ca-input--error" : ""}`}
                                            name="email"
                                            type="email"
                                            value={clientForm.email}
                                            onChange={handleClientFormChange}
                                            placeholder="email@example.com"
                                        />
                                        {clientFormErrors.email && <p className="ca-error">{clientFormErrors.email}</p>}
                                    </div>

                                    <div className="ca-field">
                                        <label className="ca-field-label">Telefon</label>
                                        <input
                                            className={`ca-input ${clientFormErrors.phoneNumber ? "ca-input--error" : ""}`}
                                            name="phoneNumber"
                                            value={clientForm.phoneNumber}
                                            onChange={handleClientFormChange}
                                            placeholder="+381..."
                                        />
                                        {clientFormErrors.phoneNumber && <p className="ca-error">{clientFormErrors.phoneNumber}</p>}
                                    </div>
                                </div>

                                <div className="ca-field-row">
                                    <div className="ca-field">
                                        <label className="ca-field-label">Pol</label>
                                        <select
                                            className={`ca-input ${clientFormErrors.gender ? "ca-input--error" : ""}`}
                                            name="gender"
                                            value={clientForm.gender}
                                            onChange={handleClientFormChange}
                                        >
                                            <option value="">Izaberite pol</option>
                                            <option value="M">Muški</option>
                                            <option value="F">Ženski</option>
                                        </select>
                                        {clientFormErrors.gender && <p className="ca-error">{clientFormErrors.gender}</p>}
                                    </div>

                                    <div className="ca-field">
                                        <label className="ca-field-label">Datum rođenja</label>
                                        <input
                                            className={`ca-input ${clientFormErrors.dateOfBirth ? "ca-input--error" : ""}`}
                                            name="dateOfBirth"
                                            type="date"
                                            value={clientForm.dateOfBirth}
                                            onChange={handleClientFormChange}
                                        />
                                        {clientFormErrors.dateOfBirth && <p className="ca-error">{clientFormErrors.dateOfBirth}</p>}
                                    </div>
                                </div>

                                <div className="ca-field">
                                    <label className="ca-field-label">Adresa</label>
                                    <input
                                        className={`ca-input ${clientFormErrors.address ? "ca-input--error" : ""}`}
                                        name="address"
                                        value={clientForm.address}
                                        onChange={handleClientFormChange}
                                        placeholder="Ulica i broj, grad"
                                    />
                                    {clientFormErrors.address && <p className="ca-error">{clientFormErrors.address}</p>}
                                </div>

                                <div className="ca-field">
                                    <label className="ca-field-label">Privremena lozinka</label>
                                    <input
                                        className={`ca-input ${clientFormErrors.password ? "ca-input--error" : ""}`}
                                        name="password"
                                        type="password"
                                        value={clientForm.password}
                                        onChange={handleClientFormChange}
                                        placeholder="Unesite privremenu lozinku"
                                    />
                                    {clientFormErrors.password && <p className="ca-error">{clientFormErrors.password}</p>}
                                </div>

                                {clientFormErrors.submit && (
                                    <p className="ca-error ca-error--submit">{clientFormErrors.submit}</p>
                                )}

                                <div className="ca-actions">
                                    <button
                                        type="button"
                                        className="ca-btn-back"
                                        onClick={closeClientModal}
                                        disabled={clientSubmitting}
                                    >
                                        Otkaži
                                    </button>

                                    <button
                                        type="submit"
                                        className="ca-btn-submit"
                                        disabled={clientSubmitting}
                                    >
                                        {clientSubmitting ? "Kreiranje..." : "Sačuvaj klijenta"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
