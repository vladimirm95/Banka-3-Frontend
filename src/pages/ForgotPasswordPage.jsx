import { useState } from "react";
import { requestPasswordReset } from "../services/AuthService";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import "./ChangePasswordPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSuccessMessage("");

    try {
      await requestPasswordReset(email);
      setSuccessMessage("Link za resetovanje lozinke je poslat na vašu email adresu.");
      setIsSubmitted(true);
    } catch {
      setMessage("Greška pri slanju linka za resetovanje.");
    }
  };

  return (
      <div className="page-bg">
        <Sidebar/>
        <div className="cp-page">
          <div className="cp-card">
            <div className="cp-header">
              <div className="cp-header-text">
                <p className="cp-eyebrow">RESET LOZINKE</p>
                <h1 className="cp-title">Zaboravljena lozinka</h1>
                <p className="cp-subtitle">
                  {isSubmitted
                      ? "Proverite vašu email adresu i kliknite na link za resetovanje lozinke."
                      : "Unesite vašu email adresu i poslaćemo vam link za resetovanje lozinke."
                  }
                </p>
              </div>
            </div>

            {!isSubmitted ? (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="cp-fields">
                    <div className="cp-field">
                      <label className="cp-label">Email adresa</label>
                      <input
                          className="cp-input"
                          type="email"
                          placeholder="unesite email adresu..."
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                      />
                    </div>

                    {message && <p className="cp-error">{message}</p>}
                  </div>

                  <div className="cp-actions">
                    <button type="submit" className="cp-btn cp-btn-primary">
                      Pošalji link
                    </button>
                    <button
                        type="button"
                        className="cp-btn cp-btn-secondary"
                        onClick={() => navigate("/login")}
                    >
                      Nazad na login
                    </button>
                  </div>
                </form>
            ) : (
                <div>
                  <div className="cp-fields">
                    <p className="cp-success">{successMessage}</p>
                    <p style={{ color: '#94a3b8', fontSize: '14px', margin: '12px 0 0 0' }}>
                      Ako ne vidite email, proverite spam folder.
                    </p>
                  </div>

                  <div className="cp-actions">
                    <button
                        type="button"
                        className="cp-btn cp-btn-secondary"
                        onClick={() => navigate("/login")}
                    >
                      Nazad na login
                    </button>
                    <button
                        type="button"
                        className="cp-btn cp-btn-primary"
                        onClick={() => setIsSubmitted(false)}
                    >
                      Pošalji ponovo
                    </button>
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
  );
}