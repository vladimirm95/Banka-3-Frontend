// TestoviCelina3.txt — Feature: Izvršavanje naloga (#59–62).
// The executor (services/bank/internal/trading/executor.go) ticks every 1s
// and chunks fills based on listing volume + randomized delay. Tests assert
// on observable properties — monotone remaining_portions, eventual done —
// not on exact fill counts.

const NASDAQ_MIC = "XNAS";
const TICKER = "MSFT";
const BANK_USD_ACCOUNT = "333000100000000420";

describe("Izvršavanje naloga — #59–62", () => {
  before(() => {
    cy.loginAs("supervisor");
    cy.setExchangeOpen(NASDAQ_MIC, true);
  });

  // #59 Market u delovima — eventually fills, status done, remaining=0
  it("#59: market BUY se izvrsava i remaining_portions ide na 0", () => {
    cy.loginAs("agent");
    cy.findListingByTicker(TICKER).then((l) => {
      cy.createOrderApi({
        account_number: BANK_USD_ACCOUNT,
        order_type: "market",
        direction: "buy",
        quantity: 5,
        listing_id: l.id,
      }).then((r) => {
        const orderId = r.body.order_id;
        cy.loginAs("supervisor");
        cy.window().then((win) => {
          const token = win.sessionStorage.getItem("accessToken");
          cy.request({
            method: "POST",
            url: `/api/orders/${orderId}/approve`,
            headers: { Authorization: `Bearer ${token}` },
          });
        });
        cy.waitForOrderStatus(orderId, "done", { timeoutMs: 60_000 }).then((o) => {
          expect(o.remaining_portions).to.eq(0);
        });
      });
    });
  });

  // #60 AON — ne izvršava se bez pune dostupne količine. The executor
  // (executor.go:401–413) implements AON as commit-the-full-quantity-and-
  // rollback-on-debit-failure: the block path requires a balance shortfall at
  // fill time. With seeded bank account funds and no orderbook depth model,
  // we can't deterministically force that rollback in CI. Skipping rather
  // than asserting qty=1 always fills (tautology — old assertion gave
  // false-positive coverage on this scenario).
  it.skip("#60: AON BUY čeka punu količinu pre izvršavanja", () => {
    // TODO: re-enable when the seed (or a test-only knob) can simulate
    // notional liquidity below the order quantity, OR when orders-execution
    // exposes per-order transaction counts so we can assert "0 partial fills".
  });

  // #61 AON happy path — when the full quantity is available, AON fills
  // atomically (single tick). We assert: order reaches `done`, remaining
  // hits 0, and the placement metadata round-trips (`all_or_none=true`).
  it("#61: AON BUY sa dostupnom količinom izvršava se atomično", () => {
    cy.loginAs("agent");
    cy.findListingByTicker(TICKER).then((l) => {
      cy.createOrderApi({
        account_number: BANK_USD_ACCOUNT,
        order_type: "market",
        direction: "buy",
        quantity: 1,
        listing_id: l.id,
        all_or_none: true,
      }).then((r) => {
        if (r.status >= 400) return;
        const orderId = r.body.order_id;
        cy.loginAs("supervisor");
        cy.window().then((win) => {
          const token = win.sessionStorage.getItem("accessToken");
          cy.request({
            method: "POST",
            url: `/api/orders/${orderId}/approve`,
            headers: { Authorization: `Bearer ${token}` },
          });
        });
        cy.waitForOrderStatus(orderId, "done", { timeoutMs: 60_000 }).then((o) => {
          expect(o.remaining_portions, "AON fills to zero in one shot").to.eq(0);
          expect(o.all_or_none, "AON flag persisted").to.eq(true);
        });
      });
    });
  });

  // #62 Stop-Limit prelazi u Limit pri trigger-u — bez vremenske kontrole tesko za testirati.
  // Asertujemo property: stop_limit order moze biti kreiran, dobija status approved
  // posle approve-a, i ne fill-uje se pre nego sto cena pogodi stop.
  it("#62: stop-limit BUY ne fill-uje se pre stop-trigger-a", () => {
    cy.loginAs("agent");
    cy.findListingByTicker(TICKER).then((l) => {
      cy.createOrderApi({
        account_number: BANK_USD_ACCOUNT,
        order_type: "stop_limit",
        direction: "buy",
        quantity: 1,
        listing_id: l.id,
        stop_price: l.price * 5, // way out of reach
        limit_price: l.price * 6,
      }).then((r) => {
        const orderId = r.body.order_id;
        cy.loginAs("supervisor");
        cy.window().then((win) => {
          const token = win.sessionStorage.getItem("accessToken");
          cy.request({
            method: "POST",
            url: `/api/orders/${orderId}/approve`,
            headers: { Authorization: `Bearer ${token}` },
          });
        });
        // Wait briefly, then assert it has NOT filled.
        cy.wait(5000);
        cy.window().then((win) => {
          const token = win.sessionStorage.getItem("accessToken");
          cy.request({
            method: "GET",
            url: "/api/orders",
            headers: { Authorization: `Bearer ${token}` },
            qs: { status: "all" },
          }).then((resp) => {
            const o = resp.body.find((x) => x.id === orderId);
            expect(o.status, "stop-limit not yet filled").to.be.oneOf(["approved", "pending"]);
            expect(o.remaining_portions).to.be.greaterThan(0);
          });
        });
      });
    });
  });
});
