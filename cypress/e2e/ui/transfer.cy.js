const mockAccounts = [
  {
    account_number: "333000112345678910",
    account_name: "Tekući račun",
    balance: 50000,
    currency: "RSD",
    account_type: "TEKUCI",
    status: "active",
  },
  {
    account_number: "333000198765432100",
    account_name: "Devizni račun",
    balance: 1200,
    currency: "EUR",
    account_type: "DEVIZNI",
    status: "active",
  },
];

describe("TransferPage", () => {
  beforeEach(() => {
    cy.loginBypass();
    cy.intercept("GET", "**/api/accounts", {
      statusCode: 200,
      body: mockAccounts,
    }).as("getAccounts");
    cy.visit("/transfer");
    cy.wait("@getAccounts");
  });

  it("prikazuje formu za prenos sa dropdown-ovima i poljem za iznos", () => {
    cy.get("select").should("have.length", 2);
    cy.get('input[type="number"]').should("exist");
    cy.get(".pay-btn-submit").should("exist");
  });

  it("učitava račune u dropdown", () => {
    cy.get("select").first().find("option").should("have.length", 3); // placeholder + 2 računa
    cy.get("select").first().find("option").eq(1).should("contain", "333000112345678910");
    cy.get("select").first().find("option").eq(2).should("contain", "333000198765432100");
  });

  it("filtrira izabrani račun iz drugog dropdown-a", () => {
    cy.get("select").first().select("333000112345678910");

    cy.get("select").eq(1).find("option").should("have.length", 2); // placeholder + 1 račun
    cy.get("select").eq(1).should("not.contain", "333000112345678910");
    cy.get("select").eq(1).should("contain", "333000198765432100");
  });

  it("prikazuje validacione greške za prazan submit", () => {
    cy.get(".pay-btn-submit").click();

    cy.get(".pay-error").should("have.length.at.least", 2);
    cy.contains("Izaberite račun sa kog šaljete").should("be.visible");
    cy.contains("Izaberite račun na koji šaljete").should("be.visible");
  });

  it("otvara TOTP modal nakon validnog submita", () => {
    cy.get("select").first().select("333000112345678910");
    cy.get("select").eq(1).select("333000198765432100");
    cy.get('input[type="number"]').type("5000");

    cy.get(".pay-btn-submit").click();

    cy.get(".totp-overlay").should("be.visible");
    cy.get(".totp-input").should("have.length", 6);
  });

  it("šalje POST /transactions/transfer sa tačnim payload-om i TOTP headerom", () => {
    cy.intercept("POST", "**/api/transactions/transfer", {
      statusCode: 200,
      body: { message: "ok" },
    }).as("transferRequest");

    cy.get("select").first().select("333000112345678910");
    cy.get("select").eq(1).select("333000198765432100");
    cy.get('input[type="number"]').type("5000");

    cy.get(".pay-btn-submit").click();
    unesiTotpKod("654321");
    cy.get(".totp-btn-confirm").click();

    cy.wait("@transferRequest").then((interception) => {
      // Provera URL-a (singular)
      expect(interception.request.url).to.include("/transactions/transfer");
      expect(interception.request.url).to.not.include("/transactions/transfers");

      // Provera TOTP headera
      expect(interception.request.headers).to.have.property("totp", "654321");

      // Provera payload-a
      const body = interception.request.body;
      expect(body.from_account).to.eq("333000112345678910");
      expect(body.to_account).to.eq("333000198765432100");
      expect(body.amount).to.eq(5000);
    });
  });

  it("prikazuje success poruku nakon uspešnog prenosa", () => {
    cy.intercept("POST", "**/api/transactions/transfer", {
      statusCode: 200,
      body: { message: "ok" },
    }).as("transferRequest");

    cy.get("select").first().select("333000112345678910");
    cy.get("select").eq(1).select("333000198765432100");
    cy.get('input[type="number"]').type("5000");

    cy.get(".pay-btn-submit").click();
    unesiTotpKod("654321");
    cy.get(".totp-btn-confirm").click();

    cy.wait("@transferRequest");
    cy.get(".totp-overlay").should("not.exist");
    cy.get(".pay-success").should("contain", "uspešno");
  });
});

function unesiTotpKod(code) {
  code.split("").forEach((digit, index) => {
    cy.get(".totp-input").eq(index).type(digit);
  });
}
