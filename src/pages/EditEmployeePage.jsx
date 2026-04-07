import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./CreateEmployeePage.css";
import "./EmployeesPage.css";
import { getEmployeeById, updateEmployee } from "../services/EmployeeService";
import Sidebar from "../components/Sidebar.jsx";

function validate(form) {
  const errors = {};
  if (!form.ime.trim()) errors.ime = "Ime je obavezno";
  if (!form.prezime.trim()) errors.prezime = "Prezime je obavezno.";
  if (!form.pol.trim()) errors.pol = "Pol je obavezan.";
  if (!form.telefon.trim()) {
    errors.telefon = "Broj telefona je obavezan.";
  } else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.telefon)) {
    errors.telefon = "Unesite ispravan broj telefona.";
  }
  if (!form.adresa.trim()) errors.adresa = "Adresa je obavezna.";
  if (!form.pozicija.trim()) errors.pozicija = "Pozicija je obavezna.";
  if (!form.departman.trim()) errors.departman = "Departman je obavezan.";
  return errors;
}

const normalize = (p) => p.toLowerCase().replace(/ /g, "_");

export default function EditEmployeePage() {
  const { id } = useParams();

  const [form, setForm] = useState({
    ime: '', prezime: "", pol: "", telefon: "",
    adresa: "", pozicija: "", departman: "", aktivan: true,
  });

  const [allPermissions] = useState([
    "trade_stocks",
    "view_stocks",
    "manage_contracts",
    "manage_insurance",
    "read_accounts",
    "write_accounts",
    "approve_loans",
    "admin"
  ]);

  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getEmployeeById(Number(id))
      .then((employee) => {
        setForm({
          ime: employee.firstName ?? "",
          prezime: employee.lastName ?? "",
          pol: employee.gender ?? "",
          telefon: employee.phone ?? "",
          adresa: employee.address ?? "",
          pozicija: employee.position ?? "",
          departman: employee.department ?? "",
          aktivan: employee.active ?? true,
        });

        const unique = [...new Set(
              (employee.permissions || []).map(p => normalize(p))
            )];

            setSelectedPermissions(unique);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  }

  const togglePermission = (perm) => {
    const normalized = normalize(perm);
    setSelectedPermissions(prev => {
      const clean = prev.map(normalize);

      if (clean.includes(normalized)) {
        return clean.filter(p => p !== normalized);
      }

      return [...clean, normalized];
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await updateEmployee(Number(id), {
        firstName: form.ime,
        lastName: form.prezime,
        gender: form.pol,
        phoneNumber: form.telefon,
        address: form.adresa,
        position: form.pozicija,
        department: form.departman,
        active: form.aktivan,
        permissions: selectedPermissions.map(p => p.toUpperCase())
      });
      setSuccessMsg("Profil uspešno izmenjen.");
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || "Greška pri izmeni profila." });
    } finally {
      setLoading(false);
    }
  }

  const formatLabel = (perm) => perm.replace(/_/g, " ");

  if (notFound) {
    return (
      <div className="page-bg">
        <Sidebar />
        <div className="create-page">
          <div className="create-form-card">
            <p className="submit-error">Zaposleni nije pronađen.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg">
      <Sidebar />
      <div className="create-page">
        <div className="create-form-card">
          {successMsg && <div className="success-msg">{successMsg}</div>}
          {errors.submit && <div className="error-msg">{errors.submit}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row-three">
              <div className="form-group">
                <label>Prezime</label>
                <input name="prezime" value={form.prezime} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Pol</label>
                <input name="pol" value={form.pol} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Telefon</label>
                <input name="telefon" value={form.telefon} onChange={handleChange} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Adresa</label>
                <input name="adresa" value={form.adresa} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Pozicija</label>
                <input name="pozicija" value={form.pozicija} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Departman</label>
                <input name="departman" value={form.departman} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Aktivan</label>
              <input
                type="checkbox"
                name="aktivan"
                checked={form.aktivan}
                onChange={handleChange}
              />
            </div>

            <div className="permissions-section">
              <span className="permissions-label">Permisije</span>
              <div className="permissions-grid">
                {allPermissions.map((perm) => (
                  <label key={perm} className="permission-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(normalize(perm))}
                      onChange={() => togglePermission(perm)}
                    />
                    <span className="checkmark"></span>
                    <span className="permission-text">{formatLabel(perm)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="create-btn create-btn-primary">
                {loading ? "Čuvanje..." : "Sačuvaj izmene"}
              </button>

              <button
                type="button"
                className="create-btn"
                onClick={() => navigate(-1)}
              >
                Otkaži
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}