import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAccounts } from "../services/AccountService";
import { transferFunds } from "../services/TransactionService";
import { getRecipients, createRecipient } from "../services/PaymentService";
import TotpModal from "../components/TotpModal";
import Sidebar from "../components/Sidebar";
import "./PaymentPage.css";

const EMPTY_FORM = {
    sender_account: "",
    recipient_account: "",
    recipient_name: "",
    amount: "",
    payment_code: "",
    reference_number: "",
    purpose: "",
};

export default function PaymentPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [showTotp, setShowTotp] = useState(false);
    const [totpError, setTotpError] = useState(""); // <-- DODATO: State za modal error

    const [accounts, setAccounts] = useState([]);
    const [recipients, setRecipients] = useState([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const accsResponse = await getAccounts();
                const recsResponse = await getRecipients();
                setAccounts(Array.isArray(accsResponse) ? accsResponse : []);
                setRecipients(Array.isArray(recsResponse) ? recsResponse : []);

                if (location.state?.recipient) {
                    const r = location.state.recipient;
                    setForm(prev => ({
                        ...prev,
                        recipient_account: r.account_number,
                        recipient_name: r.name
                    }));
                }
            } catch (e) {
                console.error("Greška pri učitavanju:", e);
            }
        }
        fetchData();
    }, [location.state]);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    function handleRecipientSelect(e) {
        const accountNumber = e.target.value;
        if (!accountNumber) return;

        const selected = recipients.find(r => r.account_number === accountNumber);
        if (selected) {
            setForm(prev => ({
                ...prev,
                recipient_account: selected.account_number,
                recipient_name: selected.name
            }));
            setErrors(prev => ({ ...prev, recipient_account: "", recipient_name: "" }));
        }
    }

    async function handleSaveRecipient() {
        if (!form.recipient_name || !form.recipient_account) {
            alert("Unesite naziv i račun primaoca pre čuvanja.");
            return;
        }

        setSaveLoading(true);
        try {
            await createRecipient({
                name: form.recipient_name,
                account_number: form.recipient_account
            });
            const updatedRecs = await getRecipients();
            setRecipients(Array.isArray(updatedRecs) ? updatedRecs : []);
            alert("Primalac je uspešno sačuvan u vaš imenik!");
        } catch (err) {
            console.error(err);
            alert("Greška: Primalac već postoji ili su podaci neispravni.");
        } finally {
            setSaveLoading(false);
        }
    }

    function validate() {
        const errs = {};
        if (!form.sender_account) errs.sender_account = "Izaberite vaš račun.";
        if (!form.recipient_account) errs.recipient_account = "Unesite račun primaoca.";
        if (!form.recipient_name) errs.recipient_name = "Unesite naziv primaoca.";
        if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) errs.amount = "Unesite ispravan iznos.";
        if (!form.payment_code) errs.payment_code = "Unesite šifru plaćanja.";
        if (!form.purpose) errs.purpose = "Unesite svrhu uplate.";
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setTotpError(""); 
        setShowTotp(true);
    }

    async function handleTotpConfirm(totpCode) {
        setSubmitting(true);
        setTotpError(""); 
        try {
            await transferFunds({ ...form, amount: Number(form.amount) }, totpCode);
            setShowTotp(false);
            setSuccessMsg("Plaćanje je uspešno izvršeno!");
            setForm(EMPTY_FORM);
        } catch (err) {
            // <-- DODATO: Prikazuje se greška u samom modalu umesto alerta!
            setTotpError(err.response?.data?.message || err.response?.data?.error || "Neispravan TOTP kod ili greška na serveru.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="pay-shell">
            <Sidebar />
            <div className="pay-content">
                
                <div className="pay-header">
                    <button className="pay-back-btn" onClick={() => navigate(-1)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <div className="pay-title-wrapper">
                        <p>Novo plaćanje</p>
                        <h1>Prenos sredstava</h1>
                    </div>
                </div>

                <div className="pay-card">
                    <form onSubmit={handleSubmit} noValidate>
                        
                        <div className="pay-section">
                            <h3 className="pay-section-title">Sa kog računa plaćate?</h3>
                            <div className="pay-field">
                                <label className="pay-label">Pošiljalac</label>
                                <select
                                    className={`pay-input ${errors.sender_account ? "pay-input--error" : ""}`}
                                    name="sender_account"
                                    value={form.sender_account}
                                    onChange={handleChange}
                                >
                                    <option value="">-- Izaberite račun --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.account_number} value={acc.account_number}>
                                            {acc.account_number} - {acc.balance.toLocaleString("sr-RS")} RSD
                                        </option>
                                    ))}
                                </select>
                                {errors.sender_account && <p className="pay-error-text">{errors.sender_account}</p>}
                            </div>
                        </div>

                        <div className="pay-section">
                            <h3 className="pay-section-title">Kome plaćate?</h3>
                            
                            <div className="pay-field">
                                <label className="pay-label">Izaberi iz imenika (opciono)</label>
                                <select className="pay-input" onChange={handleRecipientSelect} defaultValue="">
                                    <option value="">-- Brzi izbor --</option>
                                    {recipients.map(rec => (
                                        <option key={rec.id} value={rec.account_number}>
                                            {rec.name} ({rec.account_number})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pay-field">
                                <label className="pay-label">Naziv primaoca</label>
                                <input
                                    className={`pay-input ${errors.recipient_name ? "pay-input--error" : ""}`}
                                    name="recipient_name"
                                    value={form.recipient_name}
                                    onChange={handleChange}
                                    placeholder="npr. Pera Perić"
                                />
                                {errors.recipient_name && <p className="pay-error-text">{errors.recipient_name}</p>}
                            </div>

                            <div className="pay-field">
                                <label className="pay-label">Račun primaoca</label>
                                <input
                                    className={`pay-input ${errors.recipient_account ? "pay-input--error" : ""}`}
                                    name="recipient_account"
                                    value={form.recipient_account}
                                    onChange={handleChange}
                                    placeholder="npr. 160-0000000000000-00"
                                />
                                {errors.recipient_account && <p className="pay-error-text">{errors.recipient_account}</p>}
                            </div>

                            <button 
                                type="button" 
                                className="save-recipient-btn" 
                                onClick={handleSaveRecipient}
                                disabled={saveLoading}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                {saveLoading ? "Čuvanje..." : "Sačuvaj u imenik"}
                            </button>
                        </div>

                        <div className="pay-section">
                            <h3 className="pay-section-title">Detalji plaćanja</h3>
                            
                            <div className="pay-field">
                                <label className="pay-label">Iznos (RSD)</label>
                                <input 
                                    className={`pay-input ${errors.amount ? "pay-input--error" : ""}`} 
                                    name="amount" 
                                    type="number" 
                                    value={form.amount} 
                                    onChange={handleChange} 
                                    placeholder="0.00"
                                />
                                {/* <-- DODATE GREŠKE ZA SVA POLJA --> */}
                                {errors.amount && <p className="pay-error-text">{errors.amount}</p>}
                            </div>

                            <div className="pay-field-row">
                                <div className="pay-field">
                                    <label className="pay-label">Šifra</label>
                                    <input 
                                        className={`pay-input ${errors.payment_code ? "pay-input--error" : ""}`} 
                                        name="payment_code" 
                                        value={form.payment_code} 
                                        onChange={handleChange} 
                                        placeholder="npr. 289"
                                    />
                                    {errors.payment_code && <p className="pay-error-text">{errors.payment_code}</p>}
                                </div>
                                <div className="pay-field">
                                    <label className="pay-label">Svrha</label>
                                    <input 
                                        className={`pay-input ${errors.purpose ? "pay-input--error" : ""}`} 
                                        name="purpose" 
                                        value={form.purpose} 
                                        onChange={handleChange} 
                                        placeholder="Uplata po računu"
                                    />
                                    {errors.purpose && <p className="pay-error-text">{errors.purpose}</p>}
                                </div>
                            </div>
                            
                            <div className="pay-field">
                                <label className="pay-label">Poziv na broj (opciono)</label>
                                <input 
                                    className="pay-input" 
                                    name="reference_number" 
                                    value={form.reference_number} 
                                    onChange={handleChange} 
                                    placeholder="npr. 97 12-345"
                                />
                            </div>
                        </div>

                        <div className="pay-actions">
                            <button type="button" className="pay-btn-cancel" onClick={() => navigate(-1)}>Otkaži</button>
                            <button type="submit" className="pay-btn-submit" disabled={submitting}>
                                {submitting ? "Obrada..." : "Potvrdi plaćanje"}
                            </button>
                        </div>
                    </form>
                    
                    {/* <-- DODATO: .pay-success-box klasa zbog testa --> */}
                    {successMsg && (
                        <div className="pay-success-box">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: "middle", marginRight: "8px", marginBottom: "2px"}}>
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            {successMsg}
                        </div>
                    )}
                </div>
            </div>

            {/* <-- DODATO: error prop se prosleđuje u TotpModal --> */}
            {showTotp && (
                <TotpModal 
                    onConfirm={handleTotpConfirm} 
                    onCancel={() => { setShowTotp(false); setTotpError(""); }} 
                    loading={submitting} 
                    error={totpError}
                />
            )}
        </div>
    );
}