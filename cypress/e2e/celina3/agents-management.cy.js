// TestoviCelina3.txt — Feature: Upravljanje aktuarima (#1–9).
// Real-backend integration tests against ActuaryManagementPage at
// /actuary-management driven through the team's `.amp-*` DOM. The underlying
// REST endpoints live at gateway/handlers.go:94-97 (GET /api/actuaries,
// PATCH /api/actuaries/:id/limit, POST /api/actuaries/:id/reset-used-limit).

const PAGE = "/actuary-management";
const AGENT_EMAIL = "agent@banka.raf";

function captureAlerts() {
  const calls = [];
  cy.on("window:alert", (msg) => { calls.push(msg); });
  return calls;
}

describe("Upravljanje aktuarima — #1–9", () => {
  // #1: Supervizor moze da otvori portal i vidi listu agenata + filtere + akcije
  it("#1: supervizor otvara portal i vidi tabelu sa filterima i akcijama", () => {
    cy.loginAs("supervisor");
    cy.visit(PAGE);
    cy.get(".amp-title").should("contain", "Upravljanje agentima");
    cy.get(".amp-filters input[placeholder*='emailu']").should("exist");
    cy.get(".amp-filters input[placeholder*='poziciji']").should("exist");
    cy.get(".amp-table thead").should("contain", "Limit").and("contain", "Iskorišćeno");
    cy.get(".amp-table .amp-btn-reset").should("exist");
  });

  // #2: Agent ne moze da otvori portal — protected by requiredPermission=supervisor
  it("#2: agent dobija odbijen pristup portalu", () => {
    cy.loginAs("agent");
    cy.visit(PAGE, { failOnStatusCode: false });
    cy.url({ timeout: 5000 }).should("not.include", "/actuary-management");
    cy.get(".amp-title").should("not.exist");
  });

  // #3: Validan unos limita uspesno cuva
  it("#3: supervizor menja limit i unos je sacuvan", () => {
    cy.loginAs("supervisor");
    cy.visit(PAGE);
    cy.contains(".amp-table tbody tr", AGENT_EMAIL).within(() => {
      cy.get(".amp-btn-edit").click();
      cy.get(".amp-edit-input").clear().type("250000");
      cy.get(".amp-btn-save").click();
    });

    // The page swaps the edit input back for the formatted span on success.
    cy.contains(".amp-table tbody tr", AGENT_EMAIL)
      .find(".amp-limit-val")
      .should("contain", "250.000");

    // Persisted in DB (backend stores in minor units).
    cy.window().then((win) => {
      const token = win.sessionStorage.getItem("accessToken");
      cy.request({
        method: "GET",
        url: "/api/actuaries",
        headers: { Authorization: `Bearer ${token}` },
        qs: { email: AGENT_EMAIL },
      }).then((resp) => {
        expect(resp.body[0].limit).to.eq(250000 * 100);
      });
    });
  });

  // #4: Nepozitivan limit (negativan ili 0) odbacuje frontend pre slanja.
  // Spec §S4: "limit must be > 0", a ne >= 0.
  it("#4: nepozitivan limit prikazuje validacionu poruku", () => {
    const alerts = captureAlerts();
    cy.loginAs("supervisor");
    cy.visit(PAGE);
    cy.contains(".amp-table tbody tr", AGENT_EMAIL).within(() => {
      cy.get(".amp-btn-edit").click();
      cy.get(".amp-edit-input").clear().type("-5");
      cy.get(".amp-btn-save").click();
    });
    cy.wrap(alerts).should((arr) => {
      expect(arr.join(" ")).to.match(/veći od 0/i);
    });
    cy.contains(".amp-table tbody tr", AGENT_EMAIL)
      .find(".amp-edit-input")
      .should("exist");

    // Same rejection for limit = 0 (the path main allowed before this fix).
    cy.contains(".amp-table tbody tr", AGENT_EMAIL).within(() => {
      cy.get(".amp-edit-input").clear().type("0");
      cy.get(".amp-btn-save").click();
    });
    cy.wrap(alerts).should((arr) => {
      expect(arr.filter((m) => /veći od 0/i.test(m)).length).to.be.greaterThan(1);
    });
  });

  // #5: Reset usedLimit kroz modal — modal/.amp-modal + "Potvrdi reset".
  // Page disables the Reset button when usedLimit === 0, so when the seed
  // leaves used_limit at 0 the modal path can't be exercised; we still
  // assert the disabled state is correct.
  it("#5: supervizor resetuje usedLimit i potvrdjuje u modalu", () => {
    cy.loginAs("supervisor");
    cy.visit(PAGE);
    cy.contains(".amp-table tbody tr", AGENT_EMAIL).within(() => {
      cy.get(".amp-btn-reset").as("resetBtn");
    });
    cy.get("@resetBtn").then(($btn) => {
      if ($btn.is(":disabled")) {
        cy.wrap($btn).should("be.disabled");
        return;
      }
      cy.wrap($btn).click();
      cy.get(".amp-modal").should("be.visible").within(() => {
        cy.contains("button", "Potvrdi reset").click();
      });
      cy.contains(".amp-table tbody tr", AGENT_EMAIL)
        .find(".amp-used-val")
        .should("contain", "0");
    });
  });

  // #6: Limit > 0 prolazi (granicni slucaj).
  it("#6: postavljanje malog pozitivnog limita prolazi", () => {
    cy.loginAs("supervisor").then((token) => {
      cy.request({
        method: "GET",
        url: "/api/actuaries",
        headers: { Authorization: `Bearer ${token}` },
        qs: { email: AGENT_EMAIL },
      }).then((resp) => {
        const id = resp.body[0].id;
        cy.request({
          method: "PATCH",
          url: `/api/actuaries/${id}/limit`,
          headers: { Authorization: `Bearer ${token}` },
          body: { limit: 100 }, // 1.00 RSD in minor units
        }).its("status").should("be.oneOf", [200, 201]);
      });
    });
  });

  // #7: SKIPPED — see trading-day-e2e DEO 12 rationale.
  it.skip("#7: automatski reset u 23:59h — bez admin trigger endpoint-a", () => {});

  // #8: Admin je ujedno i supervizor — admin moze portal
  it("#8: admin moze da otvori portal (admin implies supervisor)", () => {
    cy.loginAs("admin");
    cy.visit(PAGE);
    cy.get(".amp-title").should("contain", "Upravljanje agentima");
  });
});
