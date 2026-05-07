import api from "./api";

// Backend persists monetary order fields in int64 minor units (cents). The
// frontend renders in major units so we divide at the boundary in mapOrder()
// and multiply at the boundary in toMinor().
const CENTS = 100;

export function toMinor(major) {
  if (major == null || major === "") return null;
  const num = Number(major);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * CENTS);
}

function divOrNull(value) {
  if (value == null) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num / CENTS;
}

function tsOrNull(value) {
  if (value == null) return null;
  return Number(value);
}

export function mapOrder(o) {
  if (!o || typeof o !== "object") return o;
  return {
    id: o.order_id ?? o.id ?? null,
    userId: o.user_id ?? null,
    userName: o.user_name ?? o.userName ?? "",
    userEmail: o.user_email ?? o.userEmail ?? "",
    role: o.user_role ?? o.role ?? "",
    orderType: (o.order_type ?? o.orderType ?? "market").toLowerCase(),
    direction: (o.direction ?? "buy").toLowerCase(),
    quantity: Number(o.quantity ?? 0),
    contractSize: Number(o.contract_size ?? o.contractSize ?? 1),
    pricePerUnit: divOrNull(o.price_per_unit ?? o.pricePerUnit) ?? 0,
    limitPrice: divOrNull(o.limit_price ?? o.limitPrice),
    stopPrice: divOrNull(o.stop_price ?? o.stopPrice),
    approxTotal: divOrNull(o.approx_total ?? o.approxTotal),
    remainingPortions: Number(o.remaining_portions ?? o.remainingPortions ?? 0),
    status: (o.status ?? "pending").toLowerCase(),
    isDone: Boolean(o.is_done ?? o.isDone ?? false),
    afterHours: Boolean(o.after_hours ?? o.afterHours ?? false),
    allOrNone: Boolean(o.all_or_none ?? o.allOrNone ?? false),
    margin: Boolean(o.margin ?? false),
    commission: divOrNull(o.commission) ?? 0,
    listingId: o.listing_id ?? o.listingId ?? null,
    optionId: o.option_id ?? o.optionId ?? null,
    forexPairId: o.forex_pair_id ?? o.forexPairId ?? null,
    accountNumber: o.account_number ?? o.accountNumber ?? null,
    approvedBy: o.approved_by ?? o.approvedBy ?? null,
    approvedById: o.approved_by_id ?? o.approvedById ?? null,
    approvedAt: tsOrNull(o.approved_at ?? o.approvedAt),
    ticker: o.ticker ?? o.listing_ticker ?? "",
    assetType: o.asset_type ?? o.assetType ?? "",
    listingName: o.listing_name ?? o.listingName ?? "",
    currency: o.currency ?? "USD",
    createdAt: tsOrNull(o.created_at ?? o.createdAt),
    lastModification: tsOrNull(o.last_modification ?? o.lastModification),
    settlementDate: tsOrNull(o.settlement_date ?? o.settlementDate),
    pendingReason: o.pending_reason ?? o.pendingReason ?? "",
  };
}

// POST /api/orders. Payload is shaped per the gateway contract:
// { account_number, order_type, direction, quantity, listing_id|option_id|
//   forex_pair_id, limit_price, stop_price, all_or_none, margin }
// All money fields in minor units.
//
// idempotencyKey (UUID generated once per CreateOrder mount, see review §S34)
// rides on the request as the Idempotency-Key header — the gateway forwards
// it to the trading RPC so a curl-spam loop deduplicates server-side rather
// than relying on the disabled-button UI guard.
export async function createOrder(payload, idempotencyKey) {
  const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
  const { data } = await api.post("/orders", payload, headers ? { headers } : undefined);
  return data;
}

// GET /api/orders — supervisor portal (status filter + agent_id filter).
// Backend rejects callers without supervisor permission (admins bypass).
export async function listOrders(filters = {}) {
  const params = {};
  if (filters.status && filters.status !== "all") params.status = filters.status;
  if (filters.agent) params.agent = filters.agent;
  const { data } = await api.get("/orders", { params });
  return (Array.isArray(data) ? data : []).map(mapOrder);
}

// GET /api/orders/my — caller's own orders. Open to any authenticated client
// or employee; the trading RPC scopes the result to the caller's placer row,
// so a fresh user gets an empty list (no NotFound).
export async function listMyOrders(status) {
  const params = {};
  if (status && status !== "all") params.status = status;
  const { data } = await api.get("/orders/my", { params });
  return (Array.isArray(data) ? data : []).map(mapOrder);
}

// approve / decline / cancel. The gateway exposes these as POST verbs.
async function transition(orderId, action) {
  const { data } = await api.post(`/orders/${orderId}/${action}`);
  return mapOrder(data);
}

export const approveOrder = (orderId) => transition(orderId, "approve");
export const declineOrder = (orderId) => transition(orderId, "decline");
export const cancelOrder = (orderId) => transition(orderId, "cancel");

// Friendly labels used across MyOrdersPage and OrdersReviewPage so the same
// status text reads identically wherever an order is shown.
export const ORDER_STATUS_LABEL = {
  pending: "Na čekanju",
  approved: "Odobren",
  declined: "Odbijen",
  cancelled: "Otkazan",
  done: "Završen",
};

export const ORDER_TYPE_LABEL = {
  market: "Market",
  limit: "Limit",
  stop: "Stop",
  stop_limit: "Stop-Limit",
};

export const ORDER_DIRECTION_LABEL = {
  buy: "Kupovina",
  sell: "Prodaja",
};
