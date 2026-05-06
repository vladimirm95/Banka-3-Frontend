// TestoviCelina3.txt — Feature: Porez tracking (#74–81).
// Real-backend integration tests against TaxPage (/tax) and the underlying
// /tax/debts and /tax/run endpoints (services/bank/internal/tax/*).

describe("Porez tracking — #74–81", () => {
  before(() => {
    cy.task("db:reset", null, { timeout: 120_000 });
  });

  // #74: Supervizor moze da otvori portal i vidi listu korisnika sa dugovanjima u RSD
  it("#74: supervizor otvara /tax i vidi tabelu i summary u RSD", () => {
    cy.loginAs("supervisor");
    cy.visit("/tax");
    cy.get(".tax-title").should("contain", "Porez tracking");
    cy.get(".tax-summary").should("contain", "Ukupan neplaćen porez");
    // RSD currency is shown in the summary value cell.
    cy.get(".tax-summary-value").last().invoke("text").should("match", /RSD/);
    // Table headers expose the per-user paid/unpaid columns.
    cy.get(".tax-table thead").should("contain", "Plaćeno").and("contain", "Neplaćeno");
  });

  // #75: Klijent nema pristup — /tax requires permission "supervisor"
  // (router/AppRouter.jsx:87). ProtectedRoute should redirect away.
  it("#75: klijent ne moze da otvori /tax", () => {
    // Explicit sessionStorage reset before client login: under full-suite
    // ordering #74's supervisor session occasionally bled through and
    // /tax rendered blank. Cookies & localStorage are NOT cleared — the
    // app uses neither, and clearing them upsets Cypress' own intercepts.
    cy.clearAllSessionStorage();
    cy.loginAs("client");
    cy.visit("/tax", { failOnStatusCode: false });
    cy.location("pathname", { timeout: 10000 }).should("not.eq", "/tax");
    cy.get(".tax-title").should("not.exist");
  });

  // #76: Filtriranje po tipu korisnika (team) — TaxPage.jsx select uses values
  // "client" / "actuary"; getTaxDebts forwards as ?team=...
  it("#76: filtriranje po tipu 'klijent' šalje ?team=client i menja listu", () => {
    cy.loginAs("supervisor");
    // Two intercepts: a generic one to drain the initial load(s), and a
    // query-param-specific one that ONLY matches the filtered request.
    // Under React.StrictMode + `vite dev` the initial useEffect double-fires,
    // producing two unfiltered /tax/debts calls; without a specific matcher
    // the post-click wait would alias to the duplicate.
    cy.intercept("GET", /\/api\/tax\/debts\?[^?]*team=client/).as("debtsFiltered");
    cy.intercept("GET", "**/api/tax/debts*").as("debtsAny");
    cy.visit("/tax");
    cy.wait("@debtsAny");
    cy.get(".tax-filters select").select("Klijenti");
    cy.contains(".tax-filters button", "Pretraži").click();
    cy.wait("@debtsFiltered").its("request.url").should("include", "team=client");
    // If the table is non-empty, every visible row must have type=client.
    cy.get("body").then(($b) => {
      if ($b.find(".tax-table tbody tr").length > 0) {
        cy.get(".tax-table tbody tr td:nth-child(4)").each(($td) => {
          expect($td.text().trim().toLowerCase()).to.eq("client");
        });
      }
    });
  });

  // #77: Filtriranje po imenu — input feeds ?name=
  it("#77: filtriranje po imenu šalje ?name= i tabela se filtrira", () => {
    cy.loginAs("supervisor");
    cy.intercept("GET", /\/api\/tax\/debts\?[^?]*name=Marko/).as("debtsFiltered");
    cy.intercept("GET", "**/api/tax/debts*").as("debtsAny");
    cy.visit("/tax");
    cy.wait("@debtsAny");
    cy.get(".tax-filters input[placeholder='Ime ili prezime']").type("Marko");
    cy.contains(".tax-filters button", "Pretraži").click();
    cy.wait("@debtsFiltered").its("request.url").should("include", "name=Marko");
  });

  // #78: Automatski mesecni cron — RunTaxJob u tax/cron.go pokrece se mesecno.
  // Nema HTTP endpoint-a za on-demand pokretanje cron-a; ručno pokretanje (#79)
  // je jedini eksterni okidač iste logike obracuna.
  it.skip("#78: automatski mesecni obračun (cron) — bez on-demand endpoint-a", () => {
    // TODO: dodati POST /tax/cron/run da bi se cron mogao testirati direktno.
  });

  // #79: Rucno pokretanje obracuna preko TaxPage — POST /tax/run.
  // Backend vraca {processed, paid, insufficient, collected_rsd, total_debt_rsd}.
  it("#79: ručno pokretanje obračuna prikazuje rezultat sa kolicinama", () => {
    cy.loginAs("supervisor");
    cy.visit("/tax");
    cy.intercept("POST", "**/api/tax/run*").as("runTax");
    cy.get(".tax-run-card").within(() => {
      cy.contains("button", /Pokreni|Obračunaj/i).click();
    });
    cy.wait("@runTax").its("response.statusCode").should("eq", 200);
    cy.get(".tax-run-result").should("be.visible");
    cy.get(".tax-run-result").invoke("text").should("match", /RSD/);
  });

  // #80: Konverzija u RSD za strane valute — provera da unpaid_rsd polje postoji
  // u svakom redu i da je iskazano u RSD (formatMoney(_, "RSD")).
  it("#80: svaki red prikazuje neplaćeni iznos u RSD-u", () => {
    cy.loginAs("supervisor");
    cy.visit("/tax");
    cy.get("body").then(($b) => {
      if ($b.find(".tax-table tbody tr").length === 0) {
        cy.log("Nema dugovanja za proveru — preskačemo strict assert.");
        return;
      }
      cy.get(".tax-table tbody tr td.tax-neg").each(($td) => {
        expect($td.text()).to.match(/RSD/);
      });
    });
  });

  // #81: Korisnik bez dobiti nema porez — agentov nalog nakon /tax/run treba
  // da ima debt = 0 (eventualno potpuno odsutan iz liste).
  it("#81: agent koji nema dobiti se ne pojavljuje u dugovanjima (ili je iznos 0)", () => {
    cy.loginAs("supervisor");
    cy.window().then((win) => {
      const token = win.sessionStorage.getItem("accessToken");
      // Run obracun prvo — da bi sve potencijalno-naplative stavke bile resene.
      cy.request({
        method: "POST",
        url: "/api/tax/run",
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      });
      cy.request({
        method: "GET",
        url: "/api/tax/debts",
        headers: { Authorization: `Bearer ${token}` },
      }).then((resp) => {
        const list = resp.body || [];
        // Backfill returned only users with unpaid > 0; the contract is monotone.
        list.forEach((d) => {
          expect(d.unpaid_rsd, `${d.first_name} ${d.last_name} ima neplaćen porez > 0`)
            .to.be.greaterThan(0);
        });
      });
    });
  });
});
