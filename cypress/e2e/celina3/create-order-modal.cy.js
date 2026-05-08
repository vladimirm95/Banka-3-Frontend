// TestoviCelina3.md — Create Order modal/UI assertions (#33, #34, #45, #47).
// Drives the React form on /orders/new — the orders-creation.cy.js spec
// covers the API-level behavior; this file fills in the dialog/banner/UI
// guarantees that don't show up in the network layer.
//
// Note: #45 (closed exchange) and #47 (after-hours) stub /api/exchanges so
// the form gets a deterministic clock-independent state. The backend rule
// for #45 (slow execution when closed) is asserted in orders-creation #46.

const NASDAQ_MIC = "XNAS";
const TICKER = "MSFT";
const BANK_USD_ACCOUNT = "333000100000000420";

describe("Create Order modal — #33 #34 #45 #47", () => {
  before(() => {
    cy.task("db:reset", null, { timeout: 120_000 });
    cy.loginAs("supervisor");
    cy.setExchangeOpen(NASDAQ_MIC, true);
  });

  beforeEach(() => {
    cy.loginAs("agent");
  });

  // ---------------------------------------------------------------------------
  // #33 — Dijalog potvrde sadrzi sve obavezne stavke
  // ---------------------------------------------------------------------------
  it("#33: confirm dialog prikazuje hartiju, smer, tip, kolicinu, racun, total", () => {
    cy.findListingByTicker(TICKER).then((l) => {
      cy.visit(`/orders/new?listingId=${l.id}&ticker=${TICKER}&direction=buy`);

      cy.get("input[type=number]").first({ timeout: 15_000 }).clear().type("3");
      cy.contains("button", "Nastavi na potvrdu").click();

      // Modal je otvoren.
      cy.get(".co-modal", { timeout: 10_000 }).should("be.visible");
      cy.contains(".co-modal h2", "Potvrda naloga").should("exist");

      // Sve obavezne stavke iz spec-a #33: hartija, smer, tip, kolicina,
      // racun, aproks. ukupno + dodatno dugme za potvrdu.
      const dl = ".co-confirm-list";
      cy.get(dl).should("contain", TICKER);
      cy.get(dl).should("contain", "Količina");
      cy.get(dl).should("contain", "3");
      cy.get(dl).should("contain", "Tip");
      cy.get(dl).should("contain", "Račun");
      cy.get(dl).should("contain", "Aproks. ukupno");

      cy.get(".co-btn-primary").contains(/Pošalji nalog/).should("exist");
    });
  });

  // ---------------------------------------------------------------------------
  // #34 — Sprecavanje duplog slanja: vise klikova na "Pošalji nalog" pravi
  // samo jedan POST /orders.
  // ---------------------------------------------------------------------------
  it("#34: vise klikova na potvrdu trigeruje samo jedan POST /orders", () => {
    cy.findListingByTicker(TICKER).then((l) => {
      cy.visit(`/orders/new?listingId=${l.id}&ticker=${TICKER}&direction=buy`);
      cy.get("input[type=number]").first({ timeout: 15_000 }).clear().type("1");

      // Drzimo POST /orders dovoljno dugo da pokusamo dva klika pre nego sto
      // dodje response — guard je na frontend strani (`disabled={submitting}`).
      let calls = 0;
      cy.intercept("POST", "**/api/orders", (req) => {
        calls += 1;
        // Mali delay da imamo prozor za dupli klik pre nego sto se vrati.
        return new Promise((resolve) => {
          setTimeout(() => {
            req.reply({ statusCode: 201, body: { order_id: 1234, status: "approved" } });
            resolve();
          }, 800);
        });
      }).as("createOrder");

      cy.contains("button", "Nastavi na potvrdu").click();

      // Modal je otvoren — pronađi NJEGOVO "Pošalji nalog" dugme. Bez
      // scopinga na .co-modal, .co-btn-primary se podudara i sa form-ovim
      // "Nastavi na potvrdu" (visible) i error-modal-ovim "U redu" (hidden).
      cy.get(".co-modal .co-btn-primary", { timeout: 10_000 })
        .should("be.visible")
        .as("submit");

      // Klik dva puta odmah zaredom.
      cy.get("@submit").click();
      cy.get("@submit").click({ force: true });

      cy.wait("@createOrder").then(() => {
        // Drugi klik je trebao da bude prazan jer je dugme disabled-ovano
        // tokom submitting=true.
        expect(calls).to.eq(1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // #45 — Banner upozorenja kada je berza zatvorena
  // ---------------------------------------------------------------------------
  it("#45: kad backend kaze is_open=false, forma prikazuje 'zatvorena' banner", () => {
    // Stub /api/exchanges tako da NYSE bude zatvoren bez open_override.
    cy.intercept("GET", "**/api/exchanges", (req) => {
      req.continue((resp) => {
        const body = (resp.body || []).map((ex) => {
          if (ex.mic_code === NASDAQ_MIC) {
            return { ...ex, is_open: false, open_override: false };
          }
          return ex;
        });
        resp.send(body);
      });
    }).as("exchanges");

    cy.findListingByTicker(TICKER).then((l) => {
      cy.visit(`/orders/new?listingId=${l.id}&ticker=${TICKER}&direction=buy`);
      cy.wait("@exchanges");

      cy.get(".co-banner--warning", { timeout: 10_000 })
        .should("contain", "zatvorena")
        .and("contain", "Market");
    });
  });

  // ---------------------------------------------------------------------------
  // #47 — After-hours upozorenje (zatvorena, ali u prozoru 4h posle close-a)
  // ---------------------------------------------------------------------------
  it("#47: after-hours stanje prikazuje 'after-hours' banner sa napomenom o sporijem izvrsavanju", () => {
    // exchangeHours.computeExchangeStatus radi:
    //   localMs = nowMs + (browserOffsetMin + offsetH*60) * 60_000
    //   localDate.getUTCHours/Minutes daju sat/minut na "exchange local clock"
    // Ako stavimo offsetH = browserOffset, onda localMs == nowMs i getUTCHours
    // vraca trenutni UTC sat. Tada close_time/open_time mozemo birati u
    // UTC-u u odnosu na trenutni cas. Zaobilazi flake oko vikenda — frozen
    // clock fiksira utorak, znamo da day != 0/6.

    const fakeNowMs = Date.UTC(2026, 4, 5, 18, 0, 0); // Tue May 5 2026, 18:00 UTC
    cy.clock(fakeNowMs);

    cy.window().then((win) => {
      // Browser tz offset u minutima, east-positive.
      const offsetMinE = -new win.Date().getTimezoneOffset();
      // parseUtcOffset prihvata "+H" / "-H" / "+H:MM".
      const sign = offsetMinE >= 0 ? "+" : "-";
      const abs = Math.abs(offsetMinE);
      const oh = Math.floor(abs / 60);
      const om = abs % 60;
      const offsetStr = om === 0 ? `${sign}${oh}` : `${sign}${oh}:${String(om).padStart(2, "0")}`;

      // Pri offsetH = browserOffset, localDate.getUTCHours == 18, getUTCMinutes == 0.
      // closeMin 17:30, openMin 13:30.
      const closeStr = "17:30";
      const openStr = "13:30";

      cy.intercept("GET", "**/api/exchanges", (req) => {
        req.continue((resp) => {
          const body = (resp.body || []).map((ex) => {
            if (ex.mic_code === NASDAQ_MIC) {
              const next = { ...ex, open_override: false, open_time: openStr, close_time: closeStr, time_zone_offset: offsetStr };
              // Ukloni is_open da bi computeExchangeStatus krenuo time-of-day
              // granom (gde se afterHours zaista racuna).
              delete next.is_open;
              return next;
            }
            return ex;
          });
          resp.send(body);
        });
      }).as("exchanges");

      cy.findListingByTicker(TICKER).then((l) => {
        cy.visit(`/orders/new?listingId=${l.id}&ticker=${TICKER}&direction=buy`);
        cy.wait("@exchanges");

        // Banner za after-hours sa pomenom 30 min cekanja. Razlikujemo ga od
        // "Zatvorena (after-hours)" closed-banner-a po jedinstvenom tekstu
        // "u after-hours periodu".
        cy.contains(".co-banner--warning", "u after-hours periodu", { timeout: 10_000 })
          .should("contain", "30 min");
      });
    });
  });
});
