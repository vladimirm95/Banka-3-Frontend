// Mirrors the rows seeded into the `permissions` table in
// scripts/db/seed.sql. Keep this list in sync with the backend.
export const PERMISSIONS = [
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervizor" },
  { value: "manage_employees", label: "Upravljanje zaposlenima" },
  { value: "manage_clients", label: "Upravljanje klijentima" },
  { value: "manage_accounts", label: "Upravljanje računima" },
  { value: "manage_companies", label: "Upravljanje firmama" },
  { value: "manage_loans", label: "Upravljanje kreditima" },
  { value: "manage_cards", label: "Upravljanje karticama" },
  { value: "manage_insurance", label: "Upravljanje osiguranjima" },
  { value: "agent", label: "Agent" },
  { value: "trade_stocks", label: "Trgovanje akcijama" },
  { value: "view_stocks", label: "Pregled akcija" },
  { value: "margin_trading", label: "Margin trgovanje" },
  { value: "trading_cancel", label: "Otkazivanje ordera" },
];
