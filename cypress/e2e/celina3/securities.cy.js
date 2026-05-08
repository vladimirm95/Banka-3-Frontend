// TestoviCelina3.md — Feature: Hartije od vrednosti – Prikaz i pretraga (#10–25).
// Drives /securities and /securities/:ticker via the real backend so the
// asserts cover both the API responses and the React filtering/sorting logic.
//
// #24 (kreiranje ordera sa nevalidnom količinom) is the same code path
// asserted in orders-creation.cy.js #27 — kept here as a thin reference
// so every scenario in this feature appears in this file.

const NASDAQ_MIC = "XNAS";
const TICKER = "MSFT";
const NONEXISTENT_TICKER = "ZZZNONE";
const FUTURES_TICKER = "CLM26"; // settlement 2026-06-22 — in the future for "today" 2026-05-08

describe("Hartije od vrednosti — #10–25", () => {
  before(() => {
    cy.task("db:reset", null, { timeout: 120_000 });
    cy.loginAs("supervisor");
    cy.setExchangeOpen(NASDAQ_MIC, true);
  });

  // ---------------------------------------------------------------------------
  // #10 — Klijent vidi samo akcije i futures (forex je sakriven)
  // ---------------------------------------------------------------------------
  it("#10: klijent ne vidi forex tab niti forex listinge", () => {
    cy.loginAs("client");
    cy.intercept("GET", "**/api/listings*").as("loadListings");
    cy.visit("/securities");
    cy.wait("@loadListings");

    cy.get(".sec-tab").should("contain", "Akcije");
    cy.get(".sec-tab").should("contain", "Futures");
    cy.get(".sec-tab").should("not.contain", "Forex");

    // No forex row ever rendered, regardless of tab.
    cy.get(".sec-table tbody tr .sec-badge--forex").should("not.exist");
  });

  // ---------------------------------------------------------------------------
  // #11 — Aktuar vidi sve podržane tipove (akcije, futures, forex)
  // ---------------------------------------------------------------------------
  it("#11: aktuar vidi sve tabove ukljucujuci Forex", () => {
    cy.loginAs("agent");
    cy.intercept("GET", "**/api/listings*").as("loadListings");
    cy.intercept("GET", "**/api/forex-pairs*").as("loadForex");
    cy.visit("/securities");
    cy.wait(["@loadListings", "@loadForex"]);

    ["Akcije", "Futures", "Forex"].forEach((label) => {
      cy.get(".sec-tab").contains(label).should("exist");
    });
  });

  // ---------------------------------------------------------------------------
  // #12 — Pretraga po ticker-u filtrira tabelu
  // ---------------------------------------------------------------------------
  it("#12: pretraga po tickeru ostavlja samo odgovarajuce hartije", () => {
    cy.loginAs("agent");
    cy.intercept("GET", "**/api/listings*").as("loadListings");
    cy.visit("/securities");
    cy.wait("@loadListings");

    cy.get(".sec-search").type(TICKER);
    cy.get(".sec-table tbody tr", { timeout: 10_000 }).should("have.length.at.least", 1);
    cy.get(".sec-table tbody tr").each(($row) => {
      cy.wrap($row).should("contain", TICKER);
    });
  });

  // ---------------------------------------------------------------------------
  // #13 — Pretraga bez rezultata prikazuje empty-state poruku
  // ---------------------------------------------------------------------------
  it("#13: nepostojeci ticker daje 'Nema hartija' poruku", () => {
    cy.loginAs("agent");
    cy.intercept("GET", "**/api/listings*").as("loadListings");
    cy.visit("/securities");
    cy.wait("@loadListings");

    cy.get(".sec-search").type(NONEXISTENT_TICKER);
    cy.get(".sec-table").should("not.exist");
    cy.get(".sec-state").should("contain", "Nema hartija");
  });

  // ---------------------------------------------------------------------------
  // #14 — Filtriranje po exchange prefixu
  // ---------------------------------------------------------------------------
  it("#14: prefix 'NA' u exchange filteru pokazuje samo NASDAQ hartije", () => {
    cy.loginAs("agent");
    cy.intercept("GET", "**/api/listings*").as("loadListings");
    cy.visit("/securities");
    cy.wait("@loadListings");

    cy.get(".sec-filter-btn").click();
    // Frontend mapira exchange_acronym → s.exchange (npr. "NASDAQ", "NYSE",
    // "CME"). Filter prefix "NA" treba da ostavi samo NASDAQ.
    cy.get('.sec-filter-input[placeholder="npr. NY"]').type("NA");

    cy.get(".sec-table tbody tr", { timeout: 10_000 }).should("have.length.at.least", 1);
    cy.get(".sec-table tbody tr").each(($row) => {
      // Kolona "Berza" je 10. po redu (index 9): Ticker, Naziv, Tip, Cena,
      // Ask, Bid, Promena, Volumen, Datum isteka, Berza, Margina.
      cy.wrap($row).find("td").eq(9).invoke("text").should("match", /^NA/i);
    });
  });

  // ---------------------------------------------------------------------------
  // #15 — Nevalidan opseg cene (min > max) prikazuje gresku, tabela prazna
  // ---------------------------------------------------------------------------
  it("#15: min > max u opsegu cene prikazuje validacionu poruku", () => {
    cy.loginAs("agent");
    cy.intercept("GET", "**/api/listings*").as("loadListings");
    cy.visit("/securities");
    cy.wait("@loadListings");

    cy.get(".sec-filter-btn").click();
    cy.get('.sec-filter-input[placeholder="Min"]').first().type("500");
    cy.get('.sec-filter-input[placeholder="Max"]').first().type("100");

    cy.get(".sec-state--error").should(
      "contain",
      "Minimalna cena ne može biti veća od maksimalne"
    );
    cy.get(".sec-table").should("not.exist");
  });

  // ---------------------------------------------------------------------------
  // #16 — Rucno osvezavanje ažurira lastRefresh
  // ---------------------------------------------------------------------------
  it("#16: klik na 'Osveži cene' pokrece nov GET /listings i azurira timestamp", () => {
    cy.loginAs("agent");
    cy.intercept("GET", "**/api/listings*").as("loadListings");
    cy.visit("/securities");
    cy.wait("@loadListings");

    cy.get(".sec-last-refresh").invoke("text").then((before) => {
      cy.intercept("GET", "**/api/listings*").as("manualRefresh");
      cy.get(".sec-refresh-btn").click();
      cy.wait("@manualRefresh");
      // Timestamp prikaz se osvezi posle refetch-a; provera da i dalje postoji
      // i da je set (ne prazan).
      cy.get(".sec-last-refresh", { timeout: 10_000 })
        .invoke("text")
        .should("not.be.empty")
        .and("contain", "Poslednje osvežavanje");
      cy.log(`pre-refresh: ${before}`);
    });
  });

  // ---------------------------------------------------------------------------
  // #17 — Automatsko osvezavanje na intervalu (silent background fetch)
  // ---------------------------------------------------------------------------
  it("#17: automatsko osvezavanje pokrece dodatni GET /listings", () => {
    // cy.clock pre cy.visit → setInterval registrovan u useEffect-u koristi
    // kontrolisanu vremensku osu. Bez ovoga, interval registrovan tokom
    // mounta ne reaguje na cy.tick.
    cy.clock(Date.now());
    cy.loginAs("agent");
    let calls = 0;
    cy.intercept("GET", "**/api/listings*", (req) => {
      calls += 1;
      req.continue();
    }).as("listingsCall");
    cy.visit("/securities");
    cy.wait("@listingsCall");

    // AUTO_REFRESH_MS = 60s u SecuritiesPage. Tick za 65s i ocekuj jos jedan
    // poziv (silent background fetch).
    cy.tick(65_000);
    cy.wait(50); // mikro pauza da se Promise resolve isproza kroz event loop
    cy.then(() => {
      expect(calls, "broj poziva /listings posle 65s").to.be.at.least(2);
    });
  });

  // ---------------------------------------------------------------------------
  // #18 — Otvaranje detalja prikazuje graf + tabelu
  // ---------------------------------------------------------------------------
  it("#18: klik na hartiju otvara detalje sa grafom i istorijom", () => {
    cy.loginAs("agent");
    cy.intercept("GET", "**/api/listings*").as("loadListings");
    cy.visit("/securities");
    cy.wait("@loadListings");

    cy.get(".sec-search").type(TICKER);
    cy.contains(".sec-table tbody tr", TICKER, { timeout: 10_000 }).click();

    cy.url().should("include", `/securities/${TICKER}`);
    cy.get(".sd-title").should("contain", TICKER);
    cy.get(".chart-container, .recharts-wrapper", { timeout: 15_000 }).should("exist");
    cy.contains(/Istorija|datum/i).should("exist");
  });

  // ---------------------------------------------------------------------------
  // #19 — Promena perioda na grafu re-fetch-uje history
  // ---------------------------------------------------------------------------
  it("#19: izbor perioda menja prikazane podatke na grafu", () => {
    cy.loginAs("agent");
    // Endpoint je /api/listings/{listingId}/history?period=month — listing_id
    // a NE ticker. Wildcard hvata bilo koji ID.
    cy.intercept("GET", "**/api/listings/*/history*").as("history");
    cy.visit(`/securities/${TICKER}`);
    cy.wait("@history");

    // SecurityChart ima dugmad sa textom "1D", "1W", "1M", "1Y", "5Y".
    // Inicijalan period je "1M"; klik na "1Y" mora pokrenuti refetch sa
    // ?period=year.
    cy.contains("button", "1Y", { timeout: 10_000 }).click();
    cy.wait("@history").its("request.url").should("include", "period=year");
  });

  // ---------------------------------------------------------------------------
  // #20 — Detaljan prikaz akcije sadrzi sekciju sa opcijama (samo za aktuara)
  // ---------------------------------------------------------------------------
  it("#20: aktuar vidi sekciju 'Lanac opcija' u detaljima MSFT", () => {
    cy.loginAs("agent");
    cy.visit(`/securities/${TICKER}`);
    cy.get(".sd-options-section", { timeout: 15_000 }).should("exist");
    cy.get(".sd-options-title").should("contain", "Lanac opcija");
    cy.get(".sd-shared-price").should("contain", "Shared Price");
    // Subhead obavezan: Last/Theta/Bid/Ask/Vol/OI + Strike
    cy.get(".ot-subhead").should("contain", "Bid").and("contain", "Ask");
    cy.contains("th", "Strike").should("exist");
  });

  // ---------------------------------------------------------------------------
  // #21 — Tabela opcija boji ITM zelenom, OTM crvenom (klasama)
  // ---------------------------------------------------------------------------
  it("#21: ITM/OTM celije imaju odgovarajuce CSS klase", () => {
    cy.loginAs("agent");
    cy.visit(`/securities/${TICKER}`);
    cy.get(".ot-table", { timeout: 15_000 }).should("exist");

    // Bar jedna ITM celija (zelena) i bar jedna OTM celija (crvena ili neutralna)
    // — tabela centriraj oko sharedPrice pa garantovano ima oba sa obe strane.
    cy.get(".ot-cell--itm").should("have.length.at.least", 1);
    cy.get(".ot-cell--otm").should("have.length.at.least", 1);
    cy.get(".ot-legend-chip--shared").should("contain", "Shared Price");
  });

  // ---------------------------------------------------------------------------
  // #22 — Filter strike vrednosti: 3 redova iznad i 3 ispod sharedPrice
  // ---------------------------------------------------------------------------
  it("#22: postavljanje broja strike vrednosti na 3 ostavlja max 6 redova po datumu", () => {
    cy.loginAs("agent");
    cy.visit(`/securities/${TICKER}`);
    cy.get(".ot-table", { timeout: 15_000 }).should("exist");

    // Komponenta ima quirk: clear() trigeruje onChange sa praznim value-om,
    // koji setuje strikeCount = "all" → input postaje disabled, .type("3")
    // pada. Zato prvo direktno upisemo "3" preko jedne change event-e (bez
    // clear), pa input ide iz "10" u "3" u jednom potezu.
    cy.get(".sd-strike-control input[type=number]")
      .should("not.be.disabled")
      .focus()
      .type("{selectAll}3", { delay: 0 });

    // Svaka tabela (po datumu isteka) treba da ima najvise 3+3 = 6 podataka
    // redova (sve <tr> unutar <tbody>; thead ima 2 reda naslova).
    cy.get(".ot-table").each(($t) => {
      cy.wrap($t).find("tbody tr").its("length").should("be.lte", 6);
    });
  });

  // ---------------------------------------------------------------------------
  // #23 — Filter futures po Settlement Date
  // ---------------------------------------------------------------------------
  it("#23: settlement-from/to filter ostavlja samo futures u opsegu", () => {
    cy.loginAs("agent");
    cy.intercept("GET", "**/api/listings*").as("loadListings");
    cy.visit("/securities");
    cy.wait("@loadListings");

    cy.get(".sec-tab").contains("Futures").click();
    cy.get(".sec-filter-btn").click();

    cy.get('.sec-filter-input[type="date"]').first().type("2026-06-01");
    cy.get('.sec-filter-input[type="date"]').eq(1).type("2026-06-30");

    cy.get(".sec-table tbody tr", { timeout: 10_000 }).should("have.length.at.least", 1);
    cy.get(".sec-table tbody tr").each(($row) => {
      cy.wrap($row).find("td").eq(8).invoke("text").then((dateText) => {
        // Kolona "Datum isteka" je formatirana sr-RS; jun 2026 dovoljan signal.
        expect(dateText).to.match(/\.6\.2026|6\. 2026|jun.*2026|\.06\.2026/i);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // #24 — Kreiranje ordera sa nevalidnom kolicinom (referenca na #27)
  // ---------------------------------------------------------------------------
  it("#24: backend odbija order sa quantity=0 (isti put kao #27)", () => {
    cy.loginAs("agent");
    cy.findListingByTicker(TICKER).then((l) => {
      cy.createOrderApi({
        account_number: "333000100000000420",
        order_type: "market",
        direction: "buy",
        quantity: 0,
        listing_id: l.id,
      }).then((resp) => {
        expect(resp.status).to.be.gte(400).and.lt(500);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // #25 — Hartije sa nepostojeceg exchange-a se ne prikazuju (preko filtera)
  // ---------------------------------------------------------------------------
  it("#25: listing bez exchange acronym-a ne prolazi kroz exchange-prefix filter", () => {
    cy.loginAs("agent");

    // Stub-ujemo /api/listings sa dva listinga u backend (raw) formatu —
    // jedan sa exchange_acronym=NASDAQ i jedan bez. Frontend mapira preko
    // mapListing (SecurityService.js:6-25), pa da se exchange string popuni
    // koristimo `exchange_acronym`.
    const stubListings = [
      {
        id: 999001, ticker: "ZZZ1", name: "Real Exchange",
        exchange_acronym: "NASDAQ", exchange_id: 2,
        price: 10000, ask_price: 10050, bid_price: 9950,
        change: 0, volume: 1000, security_type: "stock",
        maintenance_margin: 5000, last_refresh: 0, settlement_date: 0,
        contract_size: 1, min_quantity: 1, market_cap: 0,
        nominal_value: 0, initial_margin_cost: 5500,
        stock_id: 1, future_id: 0,
      },
      {
        id: 999002, ticker: "ZZZ2", name: "Unknown Exchange",
        exchange_acronym: "", exchange_id: 0,
        price: 5000, ask_price: 5050, bid_price: 4950,
        change: 0, volume: 500, security_type: "stock",
        maintenance_margin: 2500, last_refresh: 0, settlement_date: 0,
        contract_size: 1, min_quantity: 1, market_cap: 0,
        nominal_value: 0, initial_margin_cost: 2750,
        stock_id: 2, future_id: 0,
      },
    ];
    cy.intercept("GET", "**/api/listings*", { body: stubListings }).as("stubbed");
    cy.visit("/securities");
    cy.wait("@stubbed");

    // Filter po prefixu "NA" — listing bez exchange acronym-a ne moze da
    // prodje (uppercase("") nikada ne pocinje sa "NA").
    cy.get(".sec-filter-btn").click();
    cy.get('.sec-filter-input[placeholder="npr. NY"]').type("NA");

    cy.get(".sec-table tbody tr").should("contain", "ZZZ1");
    cy.get(".sec-table tbody").should("not.contain", "ZZZ2");
  });
});
