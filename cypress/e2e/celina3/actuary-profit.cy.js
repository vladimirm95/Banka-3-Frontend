// Issue #235 — Profit Banke / Performance aktuara.
// Backend endpoint /actuaries/profits ne postoji; ActuaryService.getActuaryProfits
// koristi mock kontrolisan kroz VITE_USE_ACTUARY_PROFIT_MOCK (default true).

describe("Profit Banke — Performance aktuara (#235)", () => {
  beforeEach(() => {
    cy.loginAs("supervisor");
    cy.visit("/profit/actuaries");
  });

  it("renderuje tabelu sa kolonama Ime / Prezime / Profit (RSD)", () => {
    cy.get(".profit-title").should("contain", "Performance aktuara");
    ["Ime", "Prezime", "Profit (RSD)"].forEach((h) => {
      cy.get(".profit-table thead").should("contain", h);
    });
    cy.get(".profit-table tbody tr").should("have.length.at.least", 1);
  });

  it("pretraga filtrira aktuare po imenu", () => {
    cy.get("#profit-search").type("Milić");
    cy.get(".profit-table tbody tr").should("have.length", 1);
    cy.get(".profit-table tbody tr").first().should("contain", "Milan").and("contain", "Milić");
  });

  it("prikazuje praznu poruku za pretragu bez rezultata", () => {
    cy.get("#profit-search").type("zzz-nepostojeci-aktuar");
    cy.get(".profit-empty").should("contain", "Nijedan aktuar ne odgovara");
  });

  it("negativan profit dobija loss klasu", () => {
    cy.get("#profit-search").type("Stefan");
    cy.get(".profit-table tbody tr").first().find(".profit-value--loss").should("exist");
  });
});
