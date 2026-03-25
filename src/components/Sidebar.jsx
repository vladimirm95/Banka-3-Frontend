import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/AuthService";
import "./Sidebar.css";

export default function MenuDropdown() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Zatvaranje klikom van panela
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Onemogućavanje scroll-a kada je meni otvoren
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
    }
    navigate("/login");
    setOpen(false);
  };

  // Stavke menija
  const menuSections = [
    {
      title: "Dashboard",
      items: [
        { label: "Client Dashboard", path: "/dashboard/personal" },
      ],
    },
    {
      title: "Računi",
      items: [
        { label: "Tekući račun", path: "/accounts/1" },
        { label: "Devizni račun", path: "/accounts/2" },
        { label: "Štedni računa", path: "/accounts/3" },
      ],
    },
    {
      title: "Plaćanja",
      items: [
        { label: "Novo plaćanje", path: "/payment" },
        { label: "Pregled primaoca", path: "/recipients" },
      ],
    },
    {
      title: "Kartice",
      items: [
        { label: "Lista kartica", path: "/cards" },
      ],
    },
    {
      title: "Krediti",
      items: [
        { label: "Podnošenje zahteva", path: "/loan-request" },
        { label: "Upravljanje kreditima", path: "/loans" },
      ],
    },
    {
      title: "Menjačnica",
      items: [
        { label: "Menjacnica", path: "/exchange" },
      ],
    },
    {
      title: "Administracija / HR",
      items: [
        { label: "Lista klijenata", path: "/clients" },
        { label: "Pregled računa", path: "/admin/accounts" },
        { label: "Lista zaposlenih", path: "/employees" },
      ],
    },
  ];

  return createPortal(
      <>
        {/* Burger dugme */}
        <button
            className="menu-icon-btn"
            onClick={() => setOpen(true)}
            aria-label="Meni"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Overlay + Side Panel */}
        <div className={`sidepanel-overlay${open ? " open" : ""}`} onClick={() => setOpen(false)}>
          <nav
              ref={panelRef}
              className={`sidepanel${open ? " open" : ""}`}
              onClick={(e) => e.stopPropagation()}
          >
            {/* Dugme za zatvaranje */}
            <button className="sidepanel-close" onClick={() => setOpen(false)} aria-label="Zatvori">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Sadržaj menija */}
            <div className="sidepanel-content">
              {menuSections.map((section, i) => (
                  <div key={i}>
                    <h4 style={{ color: "#94a3b8", margin: "12px 0 6px 0" }}>{section.title}</h4>
                    {section.items.map((item, j) => (
                        <button
                            key={j}
                            className="sidepanel-item"
                            onClick={() => { navigate(item.path); setOpen(false); }}
                        >
                          {item.label}
                        </button>
                    ))}
                  </div>
              ))}

              {/* Logout */}
              <button className="sidepanel-item sidepanel-logout" onClick={handleLogout}>
                Odjavi se
              </button>
            </div>
          </nav>
        </div>
      </>,
      document.body
  );
}