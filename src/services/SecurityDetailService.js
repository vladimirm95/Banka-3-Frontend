import api from "./api";

const CENTS = 100;

const PERIOD_MAP = {
  "1D": "day",
  "1W": "week",
  "1M": "month",
  "1Y": "year",
  "5Y": "5y",
};

function unixToISODate(sec) {
  if (!sec) return "";
  return new Date(sec * 1000).toISOString().slice(0, 10);
}

function daysBetween(fromUnix, toUnix) {
  const ms = (toUnix - fromUnix) * 1000;
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

async function findListingByTicker(ticker) {
  const { data } = await api.get("/listings", { params: { search: ticker } });
  const listings = Array.isArray(data) ? data : [];
  const match = listings.find((l) => l.ticker === ticker) || listings[0];
  if (!match) {
    throw new Error(`Hartija ${ticker} nije pronađena`);
  }
  return match;
}

function mapListingToDetail(l) {
  return {
    id: l.id,
    stockId: l.stock_id || 0,
    ticker: l.ticker,
    name: l.name,
    type: l.security_type === "future" ? "futures" : l.security_type,
    price: (l.price ?? 0) / CENTS,
    ask: (l.ask_price ?? 0) / CENTS,
    bid: (l.bid_price ?? 0) / CENTS,
    change: (l.change ?? 0) / CENTS,
    volume: l.volume ?? 0,
    exchange: l.exchange_acronym || "",
    // contract_size is 1 for stocks and the future's lot size for futures.
    // CreateOrderPage needs it so the "approximate total" estimate matches
    // backend pricing, which is contract_size × price × quantity.
    contractSize: l.contract_size && l.contract_size > 0 ? l.contract_size : 1,
    settlementDate: l.settlement_date_unix || null,
  };
}

export async function getSecurityDetail(ticker) {
  const listing = await findListingByTicker(ticker);
  const { data } = await api.get(`/listings/${listing.id}`);
  return mapListingToDetail(data);
}

export async function getSecurityHistory(listingId, period = "1M") {
  if (!listingId) return [];
  const backendPeriod = PERIOD_MAP[period] || "month";
  const { data } = await api.get(`/listings/${listingId}/history`, {
    params: { period: backendPeriod },
  });
  const points = data?.points || [];
  return points.map((p) => {
    const price = (p.price ?? 0) / CENTS;
    const ask = (p.ask_price ?? 0) / CENTS;
    const bid = (p.bid_price ?? 0) / CENTS;
    return {
      date: unixToISODate(p.date),
      price,
      high: Math.max(price, ask, bid),
      low: Math.min(price, ask || price, bid || price),
      volume: p.volume ?? 0,
    };
  });
}

export async function getSecurityOptions(stockId) {
  if (!stockId) return [];
  const { data: dates } = await api.get(`/stocks/${stockId}/options/dates`);
  const dateList = Array.isArray(dates) ? dates : [];
  if (dateList.length === 0) return [];

  const nowSec = Math.floor(Date.now() / 1000);

  const sets = await Promise.all(
    dateList.map(async (d) => {
      const settlementISO = unixToISODate(d.settlement_date);
      const { data: chain } = await api.get(`/stocks/${stockId}/options`, {
        params: { settlement: settlementISO },
      });
      const rows = chain?.rows || [];
      const options = rows.map((r) => ({
        strike: (r.strike ?? 0) / CENTS,
        callLast: (r.call?.last ?? 0) / CENTS,
        callTheta: (r.call?.theta ?? 0) / CENTS,
        callBid: (r.call?.bid ?? 0) / CENTS,
        callAsk: (r.call?.ask ?? 0) / CENTS,
        callVol: r.call?.volume ?? 0,
        callOI: r.call?.open_interest ?? 0,
        putLast: (r.put?.last ?? 0) / CENTS,
        putTheta: (r.put?.theta ?? 0) / CENTS,
        putBid: (r.put?.bid ?? 0) / CENTS,
        putAsk: (r.put?.ask ?? 0) / CENTS,
        putVol: r.put?.volume ?? 0,
        putOI: r.put?.open_interest ?? 0,
      }));
      return {
        settlementDate: settlementISO,
        daysToExpiry: d.days_to_expiry ?? daysBetween(nowSec, d.settlement_date),
        options,
      };
    }),
  );

  return sets.filter((s) => s.options.length > 0);
}
