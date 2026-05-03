import { useState, useEffect } from "react";
import { login, clearAuthState } from "../services/AuthService";
// import useFailedAttempts, { BLOCKED_MESSAGE } from "../utils/useFailedAttempts";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  // const { isBlocked, increment, reset } = useFailedAttempts("login");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("sessionExpired")) {
      setMessage("Vaša sesija je istekla, molimo prijavite se ponovo.");
      sessionStorage.removeItem("sessionExpired");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // if (isBlocked) {
    //   setMessage(BLOCKED_MESSAGE);
    //   return;
    // }

    if (!email || !password) {
      setMessage("Unesite email i lozinku");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await login(email, password);
      // reset();

      sessionStorage.setItem("accessToken", data.accessToken);
      sessionStorage.setItem("refreshToken", data.refreshToken);
      sessionStorage.setItem("permissions", JSON.stringify(data.permissions));
      const permissions = data.permissions || [];

      if (permissions.includes("admin") || permissions.length > 0) {
        sessionStorage.setItem("userRole", "employee");
        // Pick the first portal this employee actually has access to.
        // Agents/traders don't have manage_employees, so /employees would
        // bounce them through ProtectedRoute and loop.
        const isAdmin = permissions.includes("admin");
        const has = (p) => isAdmin || permissions.includes(p);
        const landing = has("manage_employees")
          ? "/employees"
          : has("manage_clients")
            ? "/clients"
            : has("supervisor")
              ? "/actuary-management"
              : has("manage_accounts")
                ? "/admin/accounts"
                : has("manage_loans")
                  ? "/employee-loans"
                  : "/securities";
        navigate(landing);
      } else {
        sessionStorage.setItem("userRole", "client");
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);

      if (err.response) {
        const status = err.response.status;
        const serverMsg = err.response.data;
        const serverMsgText =
          typeof serverMsg === "string"
            ? serverMsg
            : serverMsg?.error || serverMsg?.message || "";
        const normalized = String(serverMsgText).toLowerCase();

        if (
          status === 403 &&
          (normalized.includes("activate") ||
            normalized.includes("aktiv") ||
            normalized.includes("set password") ||
            normalized.includes("password") ||
            normalized.includes("expired") ||
            normalized.includes("inactive"))
        ) {
          setMessage(
            "Nalog još nije aktiviran. Proverite email i postavite lozinku putem linka za aktivaciju (ili zatražite novi link)."
          );
        } else if (status === 401) {
          // increment();
          setMessage("Pogrešan email ili lozinka");
        } else {
          setMessage("Greška na serveru pri prijavi.");
        }
      } else {
        setMessage("Mrežna greška. Proverite da li je Backend pokrenut.");
      }
      clearAuthState();
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
                type={showPassword ? "text" : "password"}
                placeholder="unesite lozinku..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <p className="forgot-password" onClick={handleForgotPassword}>
            Zaboravili ste lozinku?
          </p>

          <button type="submit" className="login-button" disabled={loading /* || isBlocked */}>
            {loading ? "Prijavljivanje..." : "Prijavi se"}
          </button>

          {/* {isBlocked ? (
            <p className="message login-blocked">{BLOCKED_MESSAGE}</p>
          ) : ( */}
            {message && <p className="message">{message}</p>}
          {/* )} */}
        </form>

        <p className="login-footer">Banka 2026 • Računarski fakultet</p>
      </div>
    </div>
  );
}