import { useState } from "react";
import "./CreateCardForm.css";

function CreateCardForm({ accounts, onSubmit }) {
  const [formData, setFormData] = useState({ accountNumber: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ accountNumber: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.accountNumber) {
      setError("Izaberite račun.");
      return;
    }

    try {
      setLoading(true);

      await onSubmit({
        accountNumber: formData.accountNumber,
      });

    } catch (err) {
      setError(err.message || "Greška.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="create-card-form" onSubmit={handleSubmit}>
      <h2>Zatraži novu karticu</h2>

      {error && <div className="message error">{error}</div>}

      <div className="form-group">
        <label>Račun *</label>
        <select
          value={formData.accountNumber || ""}
          onChange={handleChange}
          disabled={loading}
        >
          <option value="">-- Izaberite --</option>

          {accounts.map(acc => (
            <option key={acc.accountNumber} value={acc.accountNumber}>
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