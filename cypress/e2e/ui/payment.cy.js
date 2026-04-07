describe("PaymentPage", () => {
  const mockAccounts = [
    {
      account_number: "265-0000000011234-56",
      account_name: "Tekući račun",
      balance: 50000,
      currency: "RSD",
      account_type: "TEKUCI",
      status: "active",
    }
  ];

  beforeEach(() => {
    cy.loginBypass();
    // Mockujemo backend jer ga GitHub Actions ne pokreće
    cy.intercept("GET", "**/api/accounts", { statusCode: 200, body: mockAccounts }).as("getAccounts");
    cy.intercept("GET", "**/api/recipients", { statusCode: 200, body: [] }).as("getRecipients");

    cy.visit("/payment");
    cy.wait(["@getAccounts", "@getRecipients"]);
  });

  it("prikazuje formu za plaćanje sa svim poljima", () => {
    cy.get('select[name="sender_account"]').should("exist");
    cy.get('input[name="recipient_account"]').should("exist");
    cy.get('input[name="recipient_name"]').should("exist");
    cy.get('input[name="amount"]').should("exist");
    cy.get('input[name="payment_code"]').should("exist");
    cy.get('input[name="purpose"]').should("exist");
    cy.get(".pay-btn-submit").should("exist");
  });

  it("prikazuje validacione greške za prazna polja", () => {
    cy.get(".pay-btn-submit").click();
    // Umesto striktnog CSS selektora tražimo postojanje tekstova grešaka
    cy.contains("Izaberite vaš račun.").should("be.visible");
    cy.contains("Unesite račun primaoca.").should("be.visible");
    cy.contains("Unesite naziv primaoca.").should("be.visible");
    cy.contains("Unesite ispravan iznos.").should("be.visible");
    cy.contains("Unesite šifru plaćanja.").should("be.visible");
    cy.contains("Unesite svrhu uplate.").should("be.visible");
  });

  it("otvara TOTP modal nakon validnog submita", () => {
    cy.get('select[name="sender_account"]').select("265-0000000011234-56");
    cy.get('input[name="recipient_account"]').type("265-0000000099876-12");
    cy.get('input[name="recipient_name"]').type("Petar Nikolić");
    cy.get('input[name="amount"]').type("1000");
    cy.get('input[name="payment_code"]').type("289");
    cy.get('input[name="purpose"]').type("Uplata za usluge");

    cy.get(".pay-btn-submit").click();

    cy.get(".totp-overlay").should("be.visible");
    cy.get(".totp-input").should("have.length", 6);
  });

  it("šalje POST /transactions/payment sa tačnim payload-om i TOTP headerom", () => {
    cy.intercept("POST", "**/api/transactions/payment", {
      statusCode: 200,
      body: { message: "ok" },
    }).as("paymentRequest");

    cy.get('select[name="sender_account"]').select("265-0000000011234-56");
    cy.get('input[name="recipient_account"]').type("265-0000000099876-12");
    cy.get('input[name="recipient_name"]').type("Petar Nikolić");
    cy.get('input[name="amount"]').type("1500");
    cy.get('input[name="payment_code"]').type("289");
    cy.get('input[name="reference_number"]').type("97-12345678");
    cy.get('input[name="purpose"]').type("Uplata za usluge");

    cy.get(".pay-btn-submit").click();
    unesiTotpKod("123456");
    cy.get(".totp-btn-confirm").click();

    cy.wait("@paymentRequest").then((interception) => {
      expect(interception.request.url).to.include("/transactions/payment");
      expect(interception.request.headers).to.have.property("totp", "123456");

      const body = interception.request.body;
      expect(body.sender_account).to.eq("265-0000000011234-56");
      expect(body.recipient_account).to.eq("265-0000000099876-12");
      expect(body.amount).to.eq(1500);
    });
  });

  it("prikazuje success poruku nakon uspešnog plaćanja", () => {
    cy.intercept("POST", "**/api/transactions/payment", {
      statusCode: 200,
      body: { message: "ok" },
    }).as("paymentRequest");

    cy.get('select[name="sender_account"]').select("265-0000000011234-56");
    cy.get('input[name="recipient_account"]').type("265-0000000099876-12");
    cy.get('input[name="recipient_name"]').type("Petar Nikolić");
    cy.get('input[name="amount"]').type("1000");
    cy.get('input[name="payment_code"]').type("289");
    cy.get('input[name="purpose"]').type("Test");

    cy.get(".pay-btn-submit").click();
    unesiTotpKod("123456");
    cy.get(".totp-btn-confirm").click();

    cy.wait("@paymentRequest");
    cy.get(".totp-overlay").should("not.exist");
    cy.contains("uspešno").should("be.visible");
  });

  it("prikazuje grešku u TOTP modalu pri neispravnom kodu", () => {
    cy.intercept("POST", "**/api/transactions/payment", {
      statusCode: 403,
      body: { message: "Neispravan kod" },
    }).as("paymentRequest");

    cy.get('select[name="sender_account"]').select("265-0000000011234-56");
    cy.get('input[name="recipient_account"]').type("265-0000000099876-12");
    cy.get('input[name="recipient_name"]').type("Petar Nikolić");
    cy.get('input[name="amount"]').type("1000");
    cy.get('input[name="payment_code"]').type("289");
    cy.get('input[name="purpose"]').type("Test");

    cy.get(".pay-btn-submit").click();
    unesiTotpKod("000000");
    cy.get(".totp-btn-confirm").click();

    cy.wait("@paymentRequest");
    cy.get(".totp-overlay").should("be.visible");
    cy.contains("Neispravan").should("be.visible");
  });

  it("zatvara TOTP modal na Otkaži", () => {
    cy.get('select[name="sender_account"]').select("265-0000000011234-56");
    cy.get('input[name="recipient_account"]').type("265-0000000099876-12");
    cy.get('input[name="recipient_name"]').type("Petar Nikolić");
    cy.get('input[name="amount"]').type("1000");
    cy.get('input[name="payment_code"]').type("289");
    cy.get('input[name="purpose"]').type("Test");

    cy.get(".pay-btn-submit").click();
    cy.get(".totp-overlay").should("be.visible");

    cy.get(".totp-btn-cancel").click();
    cy.get(".totp-overlay").should("not.exist");
  });
});

function unesiTotpKod(code) {
  code.split("").forEach((digit, index) => {
    cy.get(".totp-input").eq(index).type(digit);
  });
}