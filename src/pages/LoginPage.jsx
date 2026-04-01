import { useState } from "react";
import { login } from "../services/AuthService";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setMessage("Unesite email i lozinku");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 1. Prvo radimo login da dobijemo tokene
      const data = await login(email, password);

      // 2. OBAVEZNO upisujemo tokene odmah, jer sledeći API pozivi 
      // u ClientService/EmployeeService koriste ove tokene iz localStorage
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("permissions", JSON.stringify(data.permissions));

      // 3. Utvrđujemo ulogu (Role Detection)
      // Pošto backend ne vraća ulogu u login odgovoru, proveravamo bazu klijenata
      localStorage.setItem("permissions", JSON.stringify(data.permissions));
      const permissions = data.permissions || [];

      if (permissions.includes("admin")) {
        localStorage.setItem("userRole", "employee");  // admin JE employee
        navigate("/employees");
      } else if (permissions.length > 0) {
        localStorage.setItem("userRole", "employee");
        navigate("/employees");
      } else {
        localStorage.setItem("userRole", "client");
        navigate("/dashboard");
      }

    } catch (err) {
      console.error("Login error:", err);
      if (err.response) {
        if (err.response.status === 401) {
          setMessage("Pogrešan email ili lozinka");
        } else {
          setMessage("Greška na serveru pri prijavi.");
        }
      } else {
        setMessage("Mrežna greška. Proverite da li je Backend pokrenut.");
      }
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-brand">
          <div className="login-brand-icon">B</div>
          <h1>Banka</h1>
          <p>Prijavite se na vaš nalog</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">EMAIL</label>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                placeholder="unesite adresu..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="password">LOZINKA</label>
            <div className="input-wrapper">
              <input
                id="password"
                type="password"
                placeholder="unesite lozinku..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <p className="forgot-password" onClick={handleForgotPassword}>
            Zaboravili ste lozinku?
          </p>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Prijavljivanje..." : "Prijavi se"}
          </button>

          {message && <p className="message">{message}</p>}
        </form>

        <p className="login-footer">Banka 2026 • Računarski fakultet</p>
      </div>
    </div>
  );
}