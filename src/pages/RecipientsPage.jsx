import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRecipients,
  createRecipient,
  updateRecipient,
  deleteRecipient,
} from "../services/PaymentService";
import Sidebar from "../components/Sidebar.jsx";
import "./RecipientsPage.css";

const EMPTY_FORM = {
  name: "",
  account_number: "",
};

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingRecipient, setEditingRecipient] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadRecipients();
  }, []);

  async function loadRecipients() {
    setLoading(true);
    setPageError("");

    try {
      const data = await getRecipients();

      if (Array.isArray(data)) {
        setRecipients(data);
      } else if (data && Array.isArray(data.content)) {
        setRecipients(data.content);
      } else {
        setRecipients([]);
      }
    } catch (error) {
      console.error("Greška pri učitavanju primalaca:", error);
      setRecipients([]);
      setPageError("Greška pri učitavanju primalaca.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!Array.isArray(recipients)) return [];

    const lower = searchTerm.trim().toLowerCase();

    return recipients.filter((r) => {
      const nameMatch = String(r?.name || "")
          .toLowerCase()
          .includes(lower);

      const accountMatch = String(r?.account_number || "")
          .toLowerCase()
          .includes(lower);

      return !lower || nameMatch || accountMatch;
    });
  }, [recipients, searchTerm]);

  // --- FUNKCIJA ZA PRELAZAK NA PLAĆANJE ---
  function handlePayToRecipient(recipient) {
    navigate("/payment", { state: { recipient: recipient } });
  }

  function openCreateModal() {
    setEditingRecipient(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(recipient) {
    setEditingRecipient(recipient);
    setForm({
      name: recipient?.name || "",
      account_number: recipient?.account_number || "",
    });
    setFormError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (formLoading) return;
    setIsModalOpen(false);
    setEditingRecipient(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedAccount = form.account_number.trim();

    if (!trimmedName) {
      setFormError("Naziv primaoca je obavezan.");
      return;
    }

    if (!trimmedAccount) {
      setFormError("Broj računa je obavezan.");
      return;
    }

    try {
      setFormLoading(true);
      setFormError("");

      const payload = {
        name: trimmedName,
        account_number: trimmedAccount,
      };

      if (editingRecipient?.id) {
        const updated = await updateRecipient(editingRecipient.id, payload);
        setRecipients((prev) =>
            prev.map((recipient) =>
                recipient.id === editingRecipient.id
                    ? {
                      ...recipient,
                      ...(updated && typeof updated === "object" ? updated : {}),
                      name: trimmedName,
                      account_number: trimmedAccount,
                    }
                    : recipient
            )
        );
      } else {
        const created = await createRecipient(payload);
        const newRecipient =
            created && typeof created === "object"
                ? created
                : {
                  id: Date.now(),
                  ...payload,
                };
        setRecipients((prev) => [newRecipient, ...prev]);
      }

      closeModal();
    } catch (error) {
      console.error("Greška pri čuvanju primaoca:", error);
      setFormError("Čuvanje primaoca nije uspelo.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(recipient) {
    const confirmed = window.confirm(
        `Da li sigurno želiš da obrišeš primaoca "${recipient?.name}"?`
    );

    if (!confirmed || !recipient?.id) return;

    try {
      setIsDeleteLoading(true);
      await deleteRecipient(recipient.id);
      setRecipients((prev) => prev.filter((r) => r.id !== recipient.id));
    } catch (error) {
      console.error("Greška pri brisanju primaoca:", error);
      alert("Brisanje primaoca nije uspelo.");
    } finally {
      setIsDeleteLoading(false);
    }
  }

  return (
      <div className="rp-bg">
        <Sidebar />

        <div className="rp-wrapper">
          <div className="rp-page-header">
            <div className="rp-header-left">
              <button
                  className="ad-back-btn"
                  onClick={() => navigate("/dashboard")}
                  aria-label="Nazad na dashboard"
              >
                <ChevronLeftIcon />
              </button>

              <div>
                <p className="rp-page-kicker">Plaćanja</p>
                <h2 className="rp-page-title">Primaoci plaćanja</h2>
              </div>
            </div>

            <div className="rp-header-actions">
              <button
                  className="rp-secondary-btn"
                  onClick={() => navigate("/payments", { state: { from: "recipients" } })}
              >
                Istorija plaćanja →
              </button>

              <button className="rp-new-btn" onClick={openCreateModal}>
                + Dodaj primaoca
              </button>
            </div>
          </div>

          <div className="rp-card">
            <div className="rp-card-header">
              <div className="rp-search-wrapper">
              <span className="rp-search-icon">
                <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>

                <input
                    className="rp-search"
                    placeholder="Pretraga po imenu ili broju računa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                {searchTerm && (
                    <button className="rp-clear-btn" onClick={() => setSearchTerm("")}>
                      <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                )}
              </div>

              <span className="rp-result-count">
              {filtered.length} / {recipients.length} primaoca
            </span>
            </div>

            {loading ? (
                <div className="rp-loading">Učitavanje...</div>
            ) : pageError ? (
                <div className="rp-empty">{pageError}</div>
            ) : filtered.length === 0 ? (
                <div className="rp-empty">Nema pronađenih primaoca.</div>
            ) : (
                <table className="rp-table">
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>Ime i prezime / naziv</th>
                    <th>Broj računa</th>
                    <th className="rp-th-actions">Akcije</th>
                  </tr>
                  </thead>
                  <tbody>
                  {filtered.map((r, i) => (
                      <tr 
                          key={r.id || `${r.account_number}-${i}`} 
                          className="rp-row"
                          onClick={() => handlePayToRecipient(r)} // Klik na red vodi na plaćanje
                          style={{ cursor: "pointer" }}
                      >
                        <td className="rp-td-index">{i + 1}</td>

                        <td className="rp-td-name">
                          <span>{r?.name || "—"}</span>
                        </td>

                        <td className="rp-td-account">{r?.account_number || "—"}</td>

                        <td className="rp-td-actions">
                          {/* Sprecavamo klik na dugme da okine klik na red (e.stopPropagation()) */}
                          <button
                              className="rp-action-btn rp-action-btn--edit"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(r);
                              }}
                          >
                            Izmeni
                          </button>

                          <button
                              className="rp-action-btn rp-action-btn--delete"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(r);
                              }}
                              disabled={isDeleteLoading}
                          >
                            Obriši
                          </button>
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
            )}
          </div>
        </div>

        {/* Modal ostaje isti... */}
        {isModalOpen && (
            <div className="rp-modal-overlay" onClick={closeModal}>
              <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="rp-modal-title">
                  {editingRecipient ? "Izmena primaoca" : "Dodavanje primaoca"}
                </h3>

                <form className="rp-form" onSubmit={handleSubmit}>
                  <div className="rp-field">
                    <label className="rp-label" htmlFor="recipient-name">
                      Naziv
                    </label>
                    <input
                        id="recipient-name"
                        name="name"
                        className="rp-input"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Unesi naziv primaoca"
                    />
                  </div>

                  <div className="rp-field">
                    <label className="rp-label" htmlFor="recipient-account-number">
                      Broj računa
                    </label>
                    <input
                        id="recipient-account-number"
                        name="account_number"
                        className="rp-input"
                        value={form.account_number}
                        onChange={handleChange}
                        placeholder="Unesi broj računa"
                    />
                  </div>

                  {formError ? <p className="rp-form-error">{formError}</p> : null}

                  <div className="rp-modal-actions">
                    <button
                        type="button"
                        className="rp-secondary-btn"
                        onClick={closeModal}
                        disabled={formLoading}
                    >
                      Poništi
                    </button>

                    <button type="submit" className="rp-new-btn" disabled={formLoading}>
                      {formLoading
                          ? "Čuvanje..."
                          : editingRecipient
                              ? "Sačuvaj izmene"
                              : "Potvrdi"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
}

function ChevronLeftIcon() {
  return (
      <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
  );
}