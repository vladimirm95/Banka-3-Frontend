import { useState } from "react";
import "./CreateCardForm.css";

function CreateCardForm({ accounts, onSubmit }) {
  const [formData, setFormData] = useState({ accountNumber: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { value } = e.target;
    setFormData({ accountNumber: value });
    setError("");
  };

  const handleRequestCard = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.accountNumber) {
      setError("Izaberite račun.");
      return;
    }

    try {
      setLoading(true);

      await onSubmit({
        accountNumber: formData.accountNumber
      });

      setSuccess("Zahtev poslat. Proverite email za potvrdu.");
      setFormData({ accountNumber: "" });

    } catch (err) {
      setError(err.message || "Greška.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="create-card-form" onSubmit={handleRequestCard}>
      <h2>Zatraži novu karticu</h2>

      {error && <div className="message error">{error}</div>}
      {success && <div className="message success">{success}</div>}

      <div className="form-group">
        <label>Račun *</label>
        <select
          value={formData.accountNumber}
          onChange={handleChange}
          disabled={loading}
        >
          <option value="">-- Izaberite --</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.accountNumber}>
              {acc.accountName} - {acc.currency}
            </option>
          ))}
        </select>
      </div>

      <button disabled={loading}>
        {loading ? "Slanje..." : "Zatraži karticu"}
      </button>
    </form>
  );
}

export default CreateCardForm;