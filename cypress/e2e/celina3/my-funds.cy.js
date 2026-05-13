// Issue #228 — Moji fondovi tab (klijent).
// Backend za fondove još nije implementiran; FundService radi u mock-mode-u.
// Test koristi mock state direktno — cy.visit() reloaduje SPA i seeduje mock
// na svakom it() preko before/beforeEach, što daje konzistentne brojke.

describe("Moj portfolio — Moji fondovi tab (#228)", () => {
  beforeEach(() => {
    cy.loginAs("client");
    cy.visit("/portfolio");
  });

  it("prikazuje oba taba i lista fondova kad se 'Moji fondovi' aktivira", () => {
    cy.get(".pf-tabs [role='tab']").should("have.length", 2);
    cy.get("#pf-tab-funds").should("have.attr", "aria-selected", "false");

    cy.get("#pf-tab-funds").click();
    cy.get("#pf-tab-funds").should("have.attr", "aria-selected", "true");
    cy.get("#pf-panel-funds").should("be.visible");

    ["Fond", "Menadžer", "Udeo", "Vrednost"].forEach((h) => {
      cy.get(".pf-funds-table thead").should("contain", h);
    });
    cy.get(".pf-funds-table tbody tr").should("have.length.at.least", 1);
    cy.get(".pf-funds-table").should("contain", "Banka 3 Equity Growth");
  });

  it("uplata povećava vrednost i udeo fonda", () => {
    cy.get("#pf-tab-funds").click();

    cy.contains(".pf-funds-table tr", "Banka 3 Equity Growth").as("row");
    cy.get("@row")
      .find(".pf-fund-share-value")
      .invoke("text")
      .then((initialPctText) => {
        const initialPct = parseFloat(initialPctText);

        cy.get("@row").find(".pf-deposit-btn").click();
        cy.get(".pf-modal").should("be.visible");
        cy.get("#pf-fund-amount").type("5000");
        cy.get(".pf-modal .pf-btn-primary").click();

        cy.get(".pf-banner--ok").should("contain", "Uplata");
        cy.get(".pf-modal").should("not.exist");

        cy.contains(".pf-funds-table tr", "Banka 3 Equity Growth")
          .find(".pf-fund-share-value")
          .invoke("text")
          .then((afterPctText) => {
            const afterPct = parseFloat(afterPctText);
            expect(afterPct).to.be.greaterThan(initialPct);
          });
      });
  });

  it("povlačenje preko raspoloživog iznosa pokazuje grešku u modalu", () => {
    cy.get("#pf-tab-funds").click();

    cy.contains(".pf-funds-table tr", "Banka 3 USD Money Market")
      .find(".pf-withdraw-btn")
      .click();

    cy.get(".pf-modal").should("be.visible");
    cy.get("#pf-fund-amount").type("999999999");
    cy.get(".pf-modal .pf-btn-primary").click();

    cy.get(".pf-modal .pf-banner--error").should("contain", "Nedovoljno");
    cy.get(".pf-modal").should("be.visible"); // modal ostaje otvoren
  });

  it("Escape zatvara modal i vraća fokus na trigger", () => {
    cy.get("#pf-tab-funds").click();

    cy.contains(".pf-funds-table tr", "Banka 3 Balanced")
      .find(".pf-deposit-btn")
      .as("trigger")
      .click();

    cy.get(".pf-modal").should("be.visible");
    cy.get("body").type("{esc}");
    cy.get(".pf-modal").should("not.exist");
    cy.get("@trigger").should("have.focus");
  });
});
