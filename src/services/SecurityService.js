import api from "./api";

// Backend stores monetary values as int64 minor units (cents).
const CENTS = 100;

function mapListing(l) {
  return {
    ticker: l.ticker,
    name: l.name,
    type: l.security_type === "future" ? "futures" : l.security_type,
    price: (l.price ?? 0) / CENTS,
    ask: (l.ask_price ?? 0) / CENTS,
    bid: (l.bid_price ?? 0) / CENTS,
    change: (l.change ?? 0) / CENTS,
    volume: l.volume ?? 0,
    exchange: l.exchange_acronym || "",
    settlementDate: l.settlement_date
      ? new Date(l.settlement_date * 1000).toISOString().slice(0, 10)
      : undefined,
    maintenanceMargin: (l.maintenance_margin ?? 0) / CENTS,
    lastRefresh: l.last_refresh
      ? new Date(l.last_refresh * 1000).toISOString()
      : null,
  };
}

function mapForex(p) {
  return {
    ticker: p.ticker,
    name: p.name,
    type: "forex",
    price: p.exchange_rate ?? 0,
    ask: p.exchange_rate ?? 0,
    bid: p.exchange_rate ?? 0,
    change: 0,
    volume: 0,
    exchange: "FOREX",
    liquidity: p.liquidity || "",
    maintenanceMargin: (p.maintenance_margin ?? 0) / CENTS,
    lastRefresh: null,
  };
}

export async function getSecurities(type = null) {
  const wantListings = type === null || type === "stock" || type === "futures";
  const wantForex = type === null || type === "forex";

  // Forex is employees-only at the gateway (PermissionDenied for clients).
  // Swallow that here so a client viewing the page doesn't see a hard error.
  const tasks = [
    wantListings ? api.get("/listings") : Promise.resolve({ data: [] }),
    wantForex
      ? api.get("/forex-pairs").catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] }),
  ];

  const [listingsRes, forexRes] = await Promise.all(tasks);
  const securities = [
    ...(listingsRes.data || []).map(mapListing),
    ...(forexRes.data || []).map(mapForex),
  ];

  return {
    data: securities,
    lastRefresh: new Date().toISOString(),
    timestamp: new Date().toLocaleString("sr-RS"),
  };
}

export async function refreshAllSecurities() {
  return getSecurities();
}

export async function refreshSecurity(ticker) {
  const all = await getSecurities();
  const security = all.data.find((s) => s.ticker === ticker);
  if (!security) {
    throw new Error(`Hartija ${ticker} nije pronađena`);
  }
  return {
    data: security,
    lastRefresh: all.lastRefresh,
    timestamp: all.timestamp,
  };
}
