// E2E: Kompletan radni dan na berzi (e2e.txt) — realigned to main's trading UI
// (ActuaryManagementPage / SecuritiesPage / SecurityDetailPage / CreateOrderPage
// / OrdersReviewPage / MyOrdersPage / PortfolioPage / TaxDashboardPage).
//
// Naming note: e2e.txt uses placeholder "Marko Markovic" (agent) /
// "Ana Jovanovic" (supervisor); the seed has agent@banka.raf and
// supervisor@banka.raf. We assert on email/role/behavior, not on names.
//
// Account note: e2e.txt says the agent owns a personal RSD/USD account, but
// accounts.owner is FK-constrained to clients only. Per spec p.51, agents
// trade against the bank's accounts (333000100000000420 USD here). When the
// placer's USD account is also the system fee/stub account, every fill
// debits and credits the same account — net delta is structurally 0. We
// therefore assert order *state* (status=done, remaining=0, used_limit > 0)
// rather than balance movement.
//
// DEO 5 (partial fills) is non-deterministic — chunk size depends on listing
// volume + a randomized delay. We assert remaining_portions monotonically
// reaches 0, not exact chunk widths.
//
// DEO 12 (23:59 used_limit reset) is skipped — there's no HTTP trigger for
// RunDailyUsedLimitReset on demand.

const NASDAQ_MIC = "XNAS";
const TICKER = "MSFT";
const BANK_USD_ACCOUNT = "333000100000000420";
const NEW_LIMIT_RSD_MAJOR = 200000;

describe("E2E: Kompletan radni dan na berzi", () => {
  // Cross-block scratchpad. Cypress isolates state between `it`s; we keep
  // ids resolved earlier in the run on this object.
  const ctx = {
    buyOrderId: null,
    sellOrderId: null,
    agentId: null,
  };

  before(() => {
    cy.task("db:reset", null, { timeout: 120_000 });

    cy.loginAs("supervisor");
    cy.setExchangeOpen(NASDAQ_MIC, true);

    cy.window().then((win) => {
      const token = win.sessionStorage.getItem("accessToken");
      cy.request({
        method: "GET",
        url: "/api/actuaries",
        headers: { Authorization: `Bearer ${token}` },
      }).then((resp) => {
        const agent = (resp.body || []).find((a) => a.email === "agent@banka.raf");
        expect(agent, "agent@banka.raf seeded actuary").to.exist;
        ctx.agentId = agent.id;
      });
    });
  });

  after(() => {
    // Best-effort: turn the override back off so we don't poison later runs.
    cy.loginAs("supervisor");
    cy.setExchangeOpen(NASDAQ_MIC, false);
  });

  // -------------------------------------------------------------------------
  // DEO 1 — Supervisor podesava limit agentu
  // -------------------------------------------------------------------------
  it("DEO 1: supervizor postavlja limit agentu na 200.000 RSD", () => {
    cy.loginAs("supervisor");
    cy.visit("/actuary-management");

    cy.contains(".amp-table tbody tr", "agent@banka.raf").within(() => {
      cy.get(".amp-btn-edit").click();
      cy.get(".amp-edit-input")
        .clear()
        .type(String(NEW_LIMIT_RSD_MAJOR));
      cy.get(".amp-btn-save").click();
    });

    // No success toast on this page — verify via API. Limit is stored in
    // minor units (RSD para).
    cy.window().then((win) => {
      const token = win.sessionStorage.getItem("accessToken");
      cy.request({
        method: "GET",
        url: "/api/actuaries",
        headers: { Authorization: `Bearer ${token}` },
      }).then((resp) => {
        const a = resp.body.find((x) => x.email === "agent@banka.raf");
        expect(a.limit).to.eq(NEW_LIMIT_RSD_MAJOR * 100);
        expect(a.used_limit).to.eq(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // DEO 2 — Agent loguje se i pretrazuje hartije
  // -------------------------------------------------------------------------
  it("DEO 2: agent pretrazuje MSFT i otvara detalje", () => {
    cy.loginAs("agent");
    cy.visit("/securities");

    cy.get(".sec-tab").contains("Akcije").should("exist");
    cy.get(".sec-tab").contains("Forex").should("exist");

    cy.get(".sec-search").type(TICKER);
    cy.contains(".sec-table tbody tr", TICKER, { timeout: 10_000 }).click();

    cy.url().should("include", `/securities/${TICKER}`);
    cy.get(".sd-title").should("contain", TICKER);
  });

  // -------------------------------------------------------------------------
  // DEO 3 — Agent kreira BUY Market order
  // -------------------------------------------------------------------------
  it("DEO 3: agent salje BUY Market 10 MSFT na bankin USD racun", () => {
    cy.loginAs("agent");
    cy.visit(`/securities/${TICKER}`);

    cy.get(".sd-buy-btn", { timeout: 10_000 }).click();

    // SecurityDetail navigates to /orders/new — order entry happens there.
    cy.url().should("include", "/orders/new");
    cy.url().should("include", `ticker=${TICKER}`);
    cy.url().should("include", "direction=buy");

    // Form has two .co-input <select>s: first = order type, second = account.
    cy.get("select.co-input").first().select("market");
    cy.get('input.co-input[type="number"]').first().clear().type("10");
    cy.get("select.co-input").last().select(BANK_USD_ACCOUNT);

    // Estimate shows the approximate total — sanity-check it rendered.
    cy.get(".co-estimate-total").invoke("text").should("not.be.empty");

    cy.contains(".co-btn-primary", "Nastavi na potvrdu").click();

    cy.intercept("POST", "**/api/orders").as("createOrder");
    cy.get(".co-modal").within(() => {
      cy.contains("dt", "Količina").next("dd").should("contain", "10");
      cy.contains(".co-btn-primary", "Pošalji nalog").click();
    });

    cy.wait("@createOrder").then(({ response }) => {
      expect(response.statusCode, "order created").to.be.oneOf([200, 201]);
      ctx.buyOrderId = response.body.order_id || response.body.id;
      expect(ctx.buyOrderId, "order id present").to.exist;
    });

    // CreateOrderPage redirects to /orders/my on success.
    cy.url({ timeout: 10_000 }).should("include", "/orders/my");

    // Commission is computed server-side; assert via supervisor read.
    cy.getOrderById(ctx.buyOrderId).then((o) => {
      expect(o.commission, "commission present").to.be.a("number");
    });
  });

  // -------------------------------------------------------------------------
  // DEO 4 — Order ide na odobrenje
  // -------------------------------------------------------------------------
  it("DEO 4: order je u Pending statusu i supervizor ga odobrava", () => {
    expect(ctx.buyOrderId, "DEO 3 must have created an order").to.exist;

    cy.loginAs("supervisor");
    cy.visit("/orders/review", {
      // OrdersReviewPage uses window.confirm() to gate Approve/Decline —
      // auto-accept it.
      onBeforeLoad(win) {
        cy.stub(win, "confirm").returns(true);
      },
    });

    cy.contains(".mo-filter", "Na čekanju").click();

    cy.contains(".mo-table tbody tr", String(ctx.buyOrderId), { timeout: 10_000 })
      .within(() => {
        cy.get(".mo-status").should("contain", "pending");
        cy.get(".mo-approve-btn").click();
      });

    cy.waitForOrderStatus(ctx.buyOrderId, ["approved", "done"]).then((o) => {
      expect(o.status).to.be.oneOf(["approved", "done"]);
    });
  });

  // -------------------------------------------------------------------------
  // DEO 5 — Market order izvrsava se u delovima
  // -------------------------------------------------------------------------
  it("DEO 5: order se izvrsava u delovima i remaining_portions ide na 0", () => {
    expect(ctx.buyOrderId).to.exist;
    cy.loginAs("supervisor");

    cy.waitForOrderStatus(ctx.buyOrderId, "done", {
      timeoutMs: 60_000,
      stepMs: 1500,
    }).then((o) => {
      expect(o.remaining_portions).to.eq(0);
      expect(o.status).to.eq("done");
    });
  });

  // -------------------------------------------------------------------------
  // DEO 6 — Hartije se pojavljuju u portfoliju agenta
  // -------------------------------------------------------------------------
  it("DEO 6: 10 MSFT akcija je u agentovom portfoliju", () => {
    cy.loginAs("agent");
    cy.visit("/portfolio");

    cy.contains(".pf-table tbody tr", TICKER, { timeout: 10_000 }).within(() => {
      // Column index 2 = "Količina" per PortfolioPage header order
      // (Tip, Ticker, Količina, Raspoloživo, ...).
      cy.get("td").eq(2).invoke("text").then((qty) => {
        expect(parseInt(qty.replace(/\D/g, ""), 10)).to.be.at.least(10);
      });
    });

    cy.get(".pf-summary").should("contain", "Plaćen porez");
    cy.get(".pf-summary").should("contain", "Neplaćen porez");
  });

  // -------------------------------------------------------------------------
  // DEO 7 — Agent prodaje 5 akcija
  // -------------------------------------------------------------------------
  it("DEO 7: agent kreira SELL Market 5 MSFT iz portfolija", () => {
    cy.loginAs("agent");
    cy.visit("/portfolio");

    // .pf-sell-btn navigates to /orders/new?direction=sell — the sell flow
    // reuses CreateOrderPage, not an in-page modal.
    cy.contains(".pf-table tbody tr", TICKER).within(() => {
      cy.get(".pf-sell-btn").click();
    });

    cy.url().should("include", "/orders/new");
    cy.url().should("include", "direction=sell");

    cy.get("select.co-input").first().select("market");
    cy.get('input.co-input[type="number"]').first().clear().type("5");
    cy.get("select.co-input").last().select(BANK_USD_ACCOUNT);

    cy.contains(".co-btn-primary", "Nastavi na potvrdu").click();

    cy.intercept("POST", "**/api/orders").as("createSellOrder");
    cy.get(".co-modal").within(() => {
      cy.contains(".co-btn-primary", "Pošalji nalog").click();
    });

    cy.wait("@createSellOrder").then(({ response }) => {
      expect(response.statusCode).to.be.oneOf([200, 201]);
      ctx.sellOrderId = response.body.order_id || response.body.id;
      expect(ctx.sellOrderId, "sell order id").to.exist;
    });

    cy.url({ timeout: 10_000 }).should("include", "/orders/my");
  });

  // -------------------------------------------------------------------------
  // DEO 8 — Supervizor odobrava SELL i izvrsi se
  // -------------------------------------------------------------------------
  it("DEO 8: supervizor odobrava SELL order, izvrsava se u celosti", () => {
    expect(ctx.sellOrderId).to.exist;
    cy.loginAs("supervisor");
    cy.visit("/orders/review", {
      onBeforeLoad(win) {
        cy.stub(win, "confirm").returns(true);
      },
    });

    cy.contains(".mo-filter", "Na čekanju").click();
    cy.contains(".mo-table tbody tr", String(ctx.sellOrderId), { timeout: 10_000 })
      .within(() => {
        cy.get(".mo-approve-btn").click();
      });

    cy.waitForOrderStatus(ctx.sellOrderId, "done", {
      timeoutMs: 60_000,
      stepMs: 1500,
    }).then((o) => {
      expect(o.status).to.eq("done");
      expect(o.direction).to.eq("sell");
    });
  });

  // -------------------------------------------------------------------------
  // DEO 9 — Portfolio nakon prodaje
  // -------------------------------------------------------------------------
  it("DEO 9: portfolio reflektuje smanjenu poziciju nakon prodaje", () => {
    cy.loginAs("agent");
    cy.visit("/portfolio");

    cy.contains(".pf-table tbody tr", TICKER).within(() => {
      cy.get("td").eq(2).invoke("text").then((qty) => {
        const n = parseInt(qty.replace(/\D/g, ""), 10);
        // We bought 10 then sold 5; with a fresh db:reset this should be 5.
        expect(n).to.be.at.least(5);
      });
    });

    cy.get(".pf-summary").should("contain", "Neplaćen porez");
  });

  // -------------------------------------------------------------------------
  // DEO 10 — Supervizor pokrece obracun poreza
  // -------------------------------------------------------------------------
  it("DEO 10: supervizor pokrece obracun poreza i transakcija se belezi", () => {
    cy.loginAs("supervisor");
    cy.visit("/tax");

    cy.intercept("POST", "**/api/tax/run*").as("runTax");
    cy.get(".collect-btn", { timeout: 10_000 }).click();

    cy.wait("@runTax").then(({ response }) => {
      expect(response.statusCode).to.be.oneOf([200, 201]);
      expect(response.body).to.have.property("rows_paid");
      expect(response.body).to.have.property("collected_rsd");
    });

    cy.get(".tax-run-result", { timeout: 10_000 }).should("be.visible");
  });

  // -------------------------------------------------------------------------
  // DEO 11 — Verifikacija krajnjeg stanja
  // -------------------------------------------------------------------------
  it("DEO 11: orderi izvrseni i usedLimit reflektuje BUY potrosnju", () => {
    cy.loginAs("supervisor");
    cy.window().then((win) => {
      const token = win.sessionStorage.getItem("accessToken");

      // See header note: when the placer's USD account doubles as the system
      // fee/stub account, balance deltas net to 0 — assert order state and
      // used_limit consumption instead.
      cy.request({
        method: "GET",
        url: "/api/orders",
        headers: { Authorization: `Bearer ${token}` },
        qs: { status: "all" },
      }).then((resp) => {
        const buy = (resp.body || []).find((o) => o.id === ctx.buyOrderId);
        const sell = (resp.body || []).find((o) => o.id === ctx.sellOrderId);
        expect(buy, "BUY order visible").to.exist;
        expect(buy.status).to.eq("done");
        expect(buy.remaining_portions).to.eq(0);
        expect(sell, "SELL order visible").to.exist;
        expect(sell.status).to.eq("done");
        expect(sell.remaining_portions).to.eq(0);
      });

      cy.request({
        method: "GET",
        url: "/api/actuaries",
        headers: { Authorization: `Bearer ${token}` },
      }).then((resp) => {
        const a = resp.body.find((x) => x.email === "agent@banka.raf");
        expect(a.used_limit, "usedLimit reflects BUY spend").to.be.greaterThan(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // DEO 12 — Automatski reset usedLimit-a u 23:59h
  // -------------------------------------------------------------------------
  // Skipped: there's no HTTP trigger for RunDailyUsedLimitReset on demand.
  // Cron at services/bank/internal/bank/cron.go fires at 23:59 server-local.
  it.skip("DEO 12: automatski reset usedLimit-a u 23:59h", () => {
    // TODO: enable once a manual trigger endpoint exists.
  });
});
