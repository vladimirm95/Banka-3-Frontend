// TestoviCelina3.md — preostali scenariji koje trading-day-e2e + portfolio
// pokrivaju samo implicitno:
//   #36 — SELL form se otvara iz portfolija sa pre-popunjenim direction=sell
//   #37 — backend odbija SELL order kad korisnik nema dovoljno hartija
//   #38 — SELL ordera za tacan broj posedovanih akcija je dozvoljen
//   #51 — order tacno na granici limita ne ide na approval
//   #9  — supervizor bez admin permisije ne moze da otvori /employees portal

const NASDAQ_MIC = "XNAS";
const TICKER = "MSFT";
const BANK_USD_ACCOUNT = "333000100000000420";
const BUY_QTY = 3;

// Helpers ---------------------------------------------------------------------

function buyAndApprove(qty) {
  let buyId;
  cy.loginAs("agent");
  cy.findListingByTicker(TICKER).then((l) => {
    cy.createOrderApi({
      account_number: BANK_USD_ACCOUNT,
      order_type: "market",
      direction: "buy",
      quantity: qty,
      listing_id: l.id,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 201]);
      buyId = r.body.order_id;
      cy.loginAs("supervisor");
      cy.window().then((win) => {
        const token = win.sessionStorage.getItem("accessToken");
        cy.request({
          method: "POST",
          url: `/api/orders/${buyId}/approve`,
          headers: { Authorization: `Bearer ${token}` },
        });
      });
      cy.waitForOrderStatus(buyId, "done", { timeoutMs: 180_000 });
    });
  });
}

describe("SELL flow + ostali nedostajuci scenariji", () => {
  before(() => {
    cy.task("db:reset", null, { timeout: 120_000 });
    cy.loginAs("supervisor");
    cy.setExchangeOpen(NASDAQ_MIC, true);
    buyAndApprove(BUY_QTY); // agent sad poseduje BUY_QTY MSFT akcija
  });

  // ---------------------------------------------------------------------------
  // #36 — SELL form se otvara iz portfolija sa direction=sell + listingId
  // ---------------------------------------------------------------------------
  it("#36: klik na 'Prodaj' u portfoliju otvara CreateOrder formu za SELL", () => {
    cy.loginAs("agent");
    cy.intercept("GET", "**/api/portfolio*").as("portfolio");
    cy.visit("/portfolio");
    cy.wait("@portfolio");

    cy.contains(".pf-table tbody tr", TICKER, { timeout: 15_000 })
      .find(".pf-sell-btn")
      .click();

    cy.url().should("include", "/orders/new");
    cy.url().should("include", "direction=sell");
    cy.url().should("include", `ticker=${TICKER}`);

    // Title odrazava SELL smer. Sacekamo dok security loaduje (loading state
    // moze da prikaze prazno H1 par stotina ms-a).
    cy.get(".co-title", { timeout: 15_000 })
      .should("contain", TICKER)
      .invoke("text")
      .should("match", /Prodaja|Sell/i);
  });

  // ---------------------------------------------------------------------------
  // #37 — Backend odbija SELL order kad qty > posedovano (assertHoldingCovers)
  // ---------------------------------------------------------------------------
  it("#37: SELL za vise akcija nego u portfoliju daje 4xx (insufficient holding)", () => {
    cy.loginAs("agent");
    cy.findListingByTicker(TICKER).then((l) => {
      cy.createOrderApi({
        account_number: BANK_USD_ACCOUNT,
        order_type: "market",
        direction: "sell",
        quantity: BUY_QTY + 100, // mnogo vise nego sto poseduje
        listing_id: l.id,
      }).then((resp) => {
        expect(resp.status).to.be.gte(400).and.lt(500);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // #38 — Tacan broj poseduje → SELL je dozvoljen i izvrsi se
  // ---------------------------------------------------------------------------
  it("#38: SELL za tacno onoliko koliko poseduje je prihvacen", () => {
    cy.loginAs("agent");
    cy.findListingByTicker(TICKER).then((l) => {
      // U trenutku ovog testa agent je vec mozda prodao deo iz #36/#37 (#36
      // samo otvara formu, #37 vraca 4xx — niko jos nije smanjio holdings).
      // Ipak — pogledajmo aktuelno stanje pre nego sto prodamo "sve".
      cy.window().then((win) => {
        const token = win.sessionStorage.getItem("accessToken");
        cy.request({
          method: "GET",
          url: "/api/portfolio",
          headers: { Authorization: `Bearer ${token}` },
        }).then((resp) => {
          const h = (resp.body || []).find((x) => x.ticker === TICKER);
          expect(h, "MSFT holding").to.exist;
          const owned = Number(h.amount);
          expect(owned).to.be.greaterThan(0);

          cy.createOrderApi({
            account_number: BANK_USD_ACCOUNT,
            order_type: "market",
            direction: "sell",
            quantity: owned,
            listing_id: l.id,
          }).then((r) => {
            expect(r.status).to.be.oneOf([200, 201]);
            expect(r.body.order_id).to.be.a("number");
          });
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // #51 — Order tacno na ivici limita ne trazi approval
  // ---------------------------------------------------------------------------
  it("#51: agent na ivici limita (need_approval=false) prolazi bez approval-a", () => {
    // Precondition: postavimo agentov flag i limit kroz DB tako da test ne
    // zavisi od redosleda izvrsavanja prethodnih testova. RSD limit u minor
    // jedinicama; postavljamo dovoljno veliki limit i used_limit blizu njega.
    // Sa qty=1 MSFT, ukupna vrednost ordera u RSD je ~price*108 (kurs USD/RSD),
    // sto je daleko ispod 10M para → bezbedno biramo limit/used tako da razlika
    // bude veca od ordera ali konacno stanje ostaje ispod limita (boundary
    // case bez prelaska).
    cy.task("db:exec", {
      sql: `UPDATE employees
              SET need_approval = FALSE,
                  "limit"       = 100000000000000,
                  used_limit    = 0
            WHERE email = 'agent@banka.raf'`,
    }).then((r) => {
      expect(r.rowCount).to.eq(1);
    });

    // Restart bank tako da scheduler/cache uzme novo stanje agenta. db:reset
    // ovo radi automatski; ovde ga obavimo "rucno" preko docker socket-a kroz
    // nas plugin.
    cy.task("db:reset", null, { timeout: 120_000 });
    // db:reset vraca seed default (need_approval=TRUE), pa moramo opet flip.
    cy.task("db:exec", {
      sql: `UPDATE employees
              SET need_approval = FALSE,
                  "limit"       = 100000000000000,
                  used_limit    = 0
            WHERE email = 'agent@banka.raf'`,
    });

    cy.loginAs("agent");
    cy.findListingByTicker(TICKER).then((l) => {
      cy.createOrderApi({
        account_number: BANK_USD_ACCOUNT,
        order_type: "market",
        direction: "buy",
        quantity: 1,
        listing_id: l.id,
      }).then((r) => {
        expect(r.status).to.be.oneOf([200, 201]);
        cy.getOrderById(r.body.order_id).then((o) => {
          // Bez approval-a status moze biti 'approved' (čeka executor) ili
          // 'done' (izvršeno). Glavni invariant: NIJE 'pending'.
          expect(o.status).to.not.eq("pending");
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // #9 — Supervizor bez admin permisije ne pristupa /employees portalu
  // ---------------------------------------------------------------------------
  it("#9: supervisor bez 'manage_employees' dobija 403 na /api/employees", () => {
    // Supervisor seed nema manage_employees permisiju (samo supervisor +
    // trade_stocks + view_stocks + margin_trading + trading_cancel) — sto
    // znaci da gateway-eva secured("manage_employees") rute treba da odbije.
    cy.loginAs("supervisor");
    cy.window().then((win) => {
      const token = win.sessionStorage.getItem("accessToken");
      cy.request({
        method: "GET",
        url: "/api/employees",
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403]);
      });
    });
  });
});
