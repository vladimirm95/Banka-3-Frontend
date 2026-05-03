import api from "./api";

// POST /api/orders — backend expects { account_number, order_type, direction,
// quantity, listing_id|option_id|forex_pair_id, limit_price, stop_price,
// all_or_none, margin }. Monetary fields are int64 cents.
export async function createOrder(payload) {
  const { data } = await api.post("/orders", payload);
  return data;
}
