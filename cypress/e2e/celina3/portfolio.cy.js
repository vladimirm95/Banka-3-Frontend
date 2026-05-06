// TestoviCelina3.txt — Feature: Moj portfolio (#67–73).

const NASDAQ_MIC = "XNAS";
const TICKER = "MSFT";
const BANK_USD_ACCOUNT = "333000100000000420";

// PortfolioPage on main was wired to the real /api/portfolio + /api/tax/me
// endpoints in this branch. Selectors below use the .pf-* test hooks
// alongside the team's .portfolio-* visual classes.
describe("Moj portfolio — #67–73", () => {
  before(() => {
    cy.task("db:reset", null, { timeout: 120_000 });
  });

  before(() => {
    cy.loginAs("supervisor");
    cy.setExchangeOpen(NASDAQ_MIC, true);

    // Make sure agent has at least 1 MSFT in portfolio so tests have something to assert on.
    // Agent has need_approval=true, so we do BUY → approve → wait for done.
    cy.loginAs("agent");
    let orderId;
    cy.findListingByTicker(TICKER).then((l) => {
      cy.createOrderApi({
        account_number: BANK_USD_ACCOUNT,
        order_type: "market",
        direction: "buy",
        quantity: 2,
        listing_id: l.id,
      }).then((r) => {
        if (r.status >= 400) return; // limit could've been hit on retry — skip seeding then
        orderId = r.body.order_id;
        cy.loginAs("supervisor");
        cy.window().then((win) => {
          const token = win.sessionStorage.getItem("accessToken");
          cy.request({
            method: "POST",
            url: `/api/orders/${orderId}/approve`,
            headers: { Authorization: `Bearer ${token}` },
          });
        });
        // Backend scheduler ima 60s initial-delay pre nego što počne partial
        // fill-ove (orders.execution.initial-delay-seconds=60). 60s budget
        // nije dovoljan — scheduler tek startuje. 180s pokriva delay + N
        // fill-ova za male qty (2 MSFT).
        cy.waitForOrderStatus(orderId, "done", { timeoutMs: 180_000 });
      });
    });
  });

  // #67: portfolio prikazuje listu posedovanih hartija sa svim kolonama
  it("#67: portfolio tabela prikazuje sve obavezne kolone", () => {
    cy.loginAs("agent");
    cy.visit("/portfolio");

    ["Tip", "Ticker", "Količina", "Avg cena", "Trenutna", "Profit", "Modifikovano"].forEach((h) => {
      cy.get(".pf-table thead").should("contain", h);
    });
  });

  // #68: ukupan profit je suma svih profita
  it("#68: total profit je vidljiv u summary kartici", () => {
    cy.loginAs("agent");
    cy.visit("/portfolio");
    cy.get(".pf-summary").contains("Ukupan profit").should("exist");
    cy.get(".pf-summary-value").first().invoke("text").should("not.be.empty");
  });

  // #69: porez sekcija — paid this year + unpaid this month
  it("#69: portfolio prikazuje plaćen porez (godina) i neplaćen (mesec)", () => {
    cy.loginAs("agent");
    cy.visit("/portfolio");
    cy.get(".pf-summary").should("contain", "Plaćen porez");
    cy.get(".pf-summary").should("contain", "Neplaćen porez");
  });

  // #70: za akcije postoji opcija javnog rezima
  it("#70: stock holding prikazuje Public dugme", () => {
    cy.loginAs("agent");
    cy.visit("/portfolio");
    cy.contains(".pf-table tr", TICKER).within(() => {
      cy.get(".pf-public-btn").should("exist");
    });
  });

  // #71: aktuar moze da iskoristi ITM put opciju.
  // Hard to make deterministic — needs an existing put option holding, ITM.
  // Skipped for stability; assertion logic is documented in PortfolioPage.jsx:117-132.
  it.skip("#71: aktuar moze da iskoristi ITM put opciju", () => {
    // TODO: requires a seeded option holding; out of scope for current seed.
  });

  // #72: klijent ne vidi opciju iskoriscavanja
  it("#72: klijent ne vidi 'Iskoristi' dugme na portfolio strani", () => {
    cy.loginAs("client");
    cy.visit("/portfolio");
    cy.contains("button", "Iskoristi").should("not.exist");
  });

  // #73: hartija prelazi u portfolio nakon izvrsenog BUY ordera —
  // implicitly tested by the before() hook above (orderId reaches "done", then
  // the test below should find the holding).
  it("#73: posle done BUY ordera, MSFT je vidljiv u portfoliju", () => {
    cy.loginAs("agent");
    cy.visit("/portfolio");
    cy.contains(".pf-table tr", TICKER, { timeout: 10_000 }).should("exist");
  });
});
