import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { createLoanRequest } from "../services/LoanService.js";
import { getAccounts } from "../services/AccountService.js"; // Moramo dohvatiti račune
import "./LoanApplicationPage.css";

export default function CreateLoanRequestPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("");
  const [salary, setSalary] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("full_time");
  const [employmentPeriod, setEmploymentPeriod] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [purpose, setPurpose] = useState("");
  const [monthlyRate, setMonthlyRate] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Učitaj račune čim se stranica otvori
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const data = await getAccounts();
        setAccounts(data || []);
        if (data && data.length > 0) {
          setSelectedAccount(data[0].account_number); // Selektuj prvi po defaultu
        }
      } catch (err) {
        console.error("Greška pri učitavanju računa:", err);
      }
    }
    fetchAccounts();
  }, []);

  const calculateRate = (a, p) => {
    if (a > 0 && p > 0) {
      setMonthlyRate((a / p).toFixed(2));
    } else {
      setMonthlyRate(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!amount || !period || !selectedAccount) {
      setError("Sva polja, uključujući izbor računa, su obavezna.");
      return;
    }

    try {
      setLoading(true);
      
      // Pronađi selektovani račun da bi znao valutu
      const accObj = accounts.find(a => a.account_number === selectedAccount);

      await createLoanRequest({
        account_number: selectedAccount,
        amount: Number(amount),
        period: Number(period),
        currency: accObj ? accObj.currency : "RSD",
        loan_type: "GOTOVINSKI",
        salary: Number(salary),
        employment_status: employmentStatus,
        employment_period: Number(employmentPeriod),
        phone_number: phoneNumber,
        purpose: purpose,
        interest_rate_type: "fixed",
      });

      setSuccess("Zahtev za kredit je uspešno podnet.");
      setAmount("");
      setPeriod("");
      setMonthlyRate(null);
    } catch (err) {
      // Ako backend vrati 400, ispisaće tačnu grešku ovde
      const msg = err.response?.data?.details || err.response?.data?.message || "Greška 400: Proverite podatke.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loan-app-page">
      <Sidebar />
      <h1 className="loan-app-title">Podnošenje zahteva za kredit</h1>

      <div className="loan-app-card">
        <form className="loan-app-form" onSubmit={handleSubmit}>
          
          <label style={{color: '#94a3b8', fontSize: '12px'}}>IZABERITE RAČUN</label>
          <select 
            value={selectedAccount} 
            onChange={(e) => setSelectedAccount(e.target.value)}
            style={{
                height: '52px', borderRadius: '12px', background: '#1e293b', 
                color: 'white', border: '1px solid #334155', padding: '0 10px', marginBottom: '10px'
            }}
          >
            {accounts.map(acc => (
              <option key={acc.account_number} value={acc.account_number}>
                {acc.account_name} ({acc.account_number})
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Iznos kredita"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              calculateRate(e.target.value, period);
            }}
          />

          <input
            type="number"
            placeholder="Period otplate (meseci)"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              calculateRate(amount, e.target.value);
            }}
          />

          <input
            type="text"
            placeholder="Svrha kredita"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />

          <input
            type="number"
            placeholder="Mesečna primanja (plata)"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
          />

          <input
            type="text"
            placeholder="Broj telefona"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />

          <select
            value={employmentStatus}
            onChange={(e) => setEmploymentStatus(e.target.value)}
            style={{
              height: '52px', borderRadius: '12px', background: '#1e293b',
              color: 'white', border: '1px solid #334155', padding: '0 10px', marginBottom: '10px'
            }}
          >
            <option value="full_time">Stalni radni odnos</option>
            <option value="part_time">Honorarni rad</option>
            <option value="self_employed">Samostalna delatnost</option>
            <option value="unemployed">Nezaposlen</option>
          </select>

          <input
            type="number"
            placeholder="Staž (meseci zaposlenja)"
            value={employmentPeriod}
            onChange={(e) => setEmploymentPeriod(e.target.value)}
          />

          {monthlyRate && (
            <div className="loan-app-rate">
              Procena mesečne rate: <strong>{monthlyRate}</strong>
            </div>
          )}

          <button className="loan-app-submit" disabled={loading}>
            {loading ? "Slanje..." : "Podnesi zahtev"}
          </button>
        </form>

        {error && <div className="loan-app-error">{error}</div>}
        {success && <div className="loan-app-success">{success}</div>}
      </div>
    </div>
  );
}