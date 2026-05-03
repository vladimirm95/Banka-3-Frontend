// TestoviCelina3.txt — Feature: Berze (Exchanges) (#82).
// Real-backend integration tests against BerzaPage (/berza) and the
// /exchanges endpoints (services/bank/internal/exchanges/*).

describe("Berze (Exchanges) — #82", () => {
  // #82: Lista berzi sa osnovnim podacima + toggle override-a radnog vremena.
  it("#82: supervizor vidi listu berzi sa svim osnovnim podacima i toggle dugmetom", () => {
    cy.loginAs("supervisor");
    cy.visit("/berza");

    cy.get(".berza-title").should("contain", "Berze");
    // Lista mora imati bar jednu kraticu — seed ucitava NYSE/NASDAQ/itd.
    cy.get(".berza-card", { timeout: 10_000 }).its("length").should("be.gte", 1);

    cy.get(".berza-card").first().within(() => {
      cy.get(".berza-exchange-name").invoke("text").should("not.be.empty");
      cy.contains(".berza-info-label", "MIC kod:");
      cy.contains(".berza-info-label", "Valuta:");
      cy.contains(".berza-info-label", "Vremenska zona:");
      cy.contains(".berza-info-label", "Radno vreme:");
      // Toggle dugme za override radnog vremena.
      cy.get(".berza-toggle-btn").should("exist");
    });

    // Klik na toggle salje PATCH /exchanges/:id/open-override i menja UI klasu.
    cy.intercept("PATCH", "**/api/exchanges/*/open-override").as("override");
    cy.get(".berza-card").first().within(() => {
      cy.get(".berza-toggle-btn").then(($btn) => {
        const wasOpen = $btn.hasClass("berza-toggle-btn--open");
        cy.wrap($btn).click();
        cy.wait("@override").its("response.statusCode").should("be.oneOf", [200, 204]);
        // Klasa se menja nakon uspesnog odgovora — proveravamo invariantu (flip).
        cy.get(".berza-toggle-btn").should(($b) => {
          expect($b.hasClass("berza-toggle-btn--open")).to.not.eq(wasOpen);
        });
      });
    });

    // Vrati u prethodno stanje da test bude idempotentan.
    cy.get(".berza-card").first().within(() => {
      cy.get(".berza-toggle-btn").click();
    });
    cy.wait("@override");
  });
});
