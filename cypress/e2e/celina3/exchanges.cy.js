// TestoviCelina3.txt — Feature: Berze (Exchanges) (#82).
// Real-backend integration tests against BerzaPage (/berza) and the
// /exchanges endpoints (services/bank/internal/exchanges/*).
// Spec p.40 / S82: tabelarni prikaz (Naziv, Akronim, MIC, Država, Valuta,
// Radno vreme, Vremenska zona, Status, Test mod). Asercije ciljaju
// .berza-table* selektore koje BerzaPage emituje za svaki red berze.

describe("Berze (Exchanges) — #82", () => {
  it("#82: supervizor vidi tabelu berzi sa svim osnovnim podacima i toggle dugmetom", () => {
    cy.loginAs("supervisor");
    cy.visit("/berza");

    cy.get(".berza-title").should("contain", "Berze");

    // Tabela mora postojati i imati spec headere.
    cy.get(".berza-table", { timeout: 10_000 }).should("exist");
    ["Naziv", "Akronim", "MIC", "Valuta", "Radno vreme", "Status"].forEach((h) => {
      cy.get(".berza-table thead").should("contain", h);
    });

    // Lista mora imati bar jedan red — seed učitava NYSE/NASDAQ/itd.
    cy.get(".berza-table tbody tr", { timeout: 10_000 }).its("length").should("be.gte", 1);

    // Status badge i Test-mod toggle moraju postojati u prvom redu.
    cy.get(".berza-table tbody tr").first().within(() => {
      cy.get(".berza-status").should("exist");
      cy.get(".berza-toggle-btn").should("exist");
    });

    // Klik na toggle šalje PATCH /exchanges/:id/open-override i menja UI klasu.
    cy.intercept("PATCH", "**/api/exchanges/*/open-override").as("override");

    cy.get(".berza-table tbody tr").first().find(".berza-toggle-btn").then(($btn) => {
      const wasOpen = $btn.hasClass("berza-toggle-btn--open");
      cy.wrap($btn).click();
      cy.wait("@override").its("response.statusCode").should("be.oneOf", [200, 204]);
      // Klasa se menja nakon uspešnog odgovora — proveravamo invariantu (flip).
      cy.get(".berza-table tbody tr").first().find(".berza-toggle-btn").should(($b) => {
        expect($b.hasClass("berza-toggle-btn--open")).to.not.eq(wasOpen);
      });
    });

    // Vrati u prethodno stanje da test bude idempotentan.
    cy.get(".berza-table tbody tr").first().find(".berza-toggle-btn").click();
    cy.wait("@override");
  });
});
