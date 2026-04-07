const mockRates = [
  { currencyCode: "EUR", buyRate: 117.0, middleRate: 117.5, sellRate: 118.0 },
  { currencyCode: "USD", buyRate: 108.0, middleRate: 108.5, sellRate: 109.0 },
];

const mockAccounts = [
  {
    account_number: "333000100000000001",
    account_name: "EUR račun",
    balance: 500,
    currency: "EUR",
    account_type: "DEVIZNI",
    status: "active",
  },
  {
    account_number: "333000100000000002",
    account_name: "USD račun",
    balance: 300,
    currency: "USD",
    account_type: "DEVIZNI",
    status: "active",
  },
];

const mockTransferResponse = {
  from_account: "333000100000000001",
  to_account: "333000100000000002",
  initial_amount: 100,
  final_amount: 92.16,
  fee: 0,
  currency: "USD",
  payment_code: "289",
  reference_number: "117.6926",
  purpose: "Konverzija valuta",
  status: "Realizovano",
  timestamp: "2025-01-01T10:00:00Z",
};

describe("ExchangePage – konverzija valuta", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/exchange-rates", {
      statusCode: 200,
      body: mockRates,
    }).as("getRates");

    cy.intercept("GET", "**/api/accounts", {
      statusCode: 200,
      body: mockAccounts,
    }).as("getAccounts");

    cy.visitAsClient("/exchange");
    cy.wait("@getRates");
    cy.wait("@getAccounts");
  });

  it("prikazuje formu sa selektima i poljem za iznos", () => {
    cy.get(".ex-select").should("have.length.at.least", 4);
    cy.get(".ex-input").first().should("exist");
    cy.get(".ex-submit-btn").should("exist");
  });

  it("dugme za konverziju je onemogućeno dok forma nije popunjena", () => {
    cy.get(".ex-submit-btn").should("be.disabled");
  });

  it("učitava račune u dropdown-ove na osnovu valute", () => {
    // fromCurrency default EUR — treba da postoji EUR račun
    cy.get(".ex-select").eq(1).find("option").should("contain", "333000100000000001");
  });

  it("šalje POST /transactions/transfer sa brojevima računa (ne valutama)", () => {
    cy.intercept("POST", "**/api/transactions/transfer", {
      statusCode: 200,
      body: mockTransferResponse,
    }).as("transfer");

    // Izaberi EUR račun kao izvorni
    cy.get(".ex-select").eq(1).select("333000100000000001");
    // Promeni ciljnu valutu na USD
    cy.get(".ex-select").eq(2).select("USD");
    // Izaberi USD račun kao ciljni
    cy.get(".ex-select").eq(3).select("333000100000000002");
    // Unesi iznos
    cy.get(".ex-input").first().type("100");

    cy.get(".ex-submit-btn").click();

    cy.wait("@transfer").then((interception) => {
      const body = interception.request.body;
      // Mora da šalje brojeve računa, NE valute
      expect(body.from_account).to.eq("333000100000000001");
      expect(body.to_account).to.eq("333000100000000002");
      expect(body.amount).to.eq(100);
    });
  });

  it("ne šalje valutu kao from_account ili to_account", () => {
    cy.intercept("POST", "**/api/transactions/transfer", {
      statusCode: 200,
      body: mockTransferResponse,
    }).as("transfer");

    cy.get(".ex-select").eq(1).select("333000100000000001");
    cy.get(".ex-select").eq(2).select("USD");
    cy.get(".ex-select").eq(3).select("333000100000000002");
    cy.get(".ex-input").first().type("50");

    cy.get(".ex-submit-btn").click();

    cy.wait("@transfer").then((interception) => {
      const body = interception.request.body;
      expect(body.from_account).to.not.eq("EUR");
      expect(body.from_account).to.not.eq("USD");
      expect(body.to_account).to.not.eq("EUR");
      expect(body.to_account).to.not.eq("USD");
    });
  });

  it("prikazuje success poruku sa initial_amount i final_amount iz odgovora", () => {
    cy.intercept("POST", "**/api/transactions/transfer", {
      statusCode: 200,
      body: mockTransferResponse,
    }).as("transfer");

    cy.get(".ex-select").eq(1).select("333000100000000001");
    cy.get(".ex-select").eq(2).select("USD");
    cy.get(".ex-select").eq(3).select("333000100000000002");
    cy.get(".ex-input").first().type("100");

    cy.get(".ex-submit-btn").click();
    cy.wait("@transfer");

    // Success poruka mora sadržati iznose iz odgovora
    cy.get(".ex-msg--success")
      .should("be.visible")
      .and("contain", "100")      // initial_amount
      .and("contain", "92,16");   // final_amount (srpski format)
  });

  it("prikazuje grešku ako transfer ne uspe", () => {
    cy.intercept("POST", "**/api/transactions/transfer", {
      statusCode: 400,
      body: { error: "Nedovoljno sredstava" },
    }).as("transferFail");

    cy.get(".ex-select").eq(1).select("333000100000000001");
    cy.get(".ex-select").eq(2).select("USD");
    cy.get(".ex-select").eq(3).select("333000100000000002");
    cy.get(".ex-input").first().type("100");

    cy.get(".ex-submit-btn").click();
    cy.wait("@transferFail");

    cy.get(".ex-msg--error").should("be.visible").and("contain", "Greška");
  });
});
