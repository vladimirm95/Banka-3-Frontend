describe("PaymentPage", () => {
  beforeEach(() => {
    cy.loginBypass();
    cy.visit("/payment");
  });

  it("prikazuje formu za plaćanje sa svim poljima", () => {
    cy.get('input[name="sender_account"]').should("exist");
    cy.get('input[name="recipient_account"]').should("exist");
    cy.get('input[name="recipient_name"]').should("exist");
    cy.get('input[name="amount"]').should("exist");
    cy.get('input[name="payment_code"]').should("exist");
    cy.get('input[name="purpose"]').should("exist");
    cy.get('input[name="reference_number"]').should("exist");
    cy.get(".pay-btn-submit").should("exist");
  });

  it("prikazuje validacione greške za prazna polja", () => {
    cy.get(".pay-btn-submit").click();

    cy.get(".pay-error").should("have.length.at.least", 5);
    cy.contains("Unesite broj računa pošiljaoca").should("be.visible");
    cy.contains("Unesite broj računa primaoca").should("be.visible");
    cy.contains("Unesite ime primaoca").should("be.visible");
    cy.contains("Unesite ispravan iznos").should("be.visible");
    cy.contains("Unesite pozivni kod plaćanja").should("be.visible");
    cy.contains("Unesite svrhu plaćanja").should("be.visible");
  });

  it("otvara TOTP modal nakon validnog submita", () => {
    cy.get('input[name="sender_account"]').type("265-0000000011234-56");
    cy.get('input[name="recipient_account"]').type("265-0000000099876-12");
    cy.get('input[name="recipient_name"]').type("Petar Nikolić");
    cy.get('input[name="amount"]').type("1000");
    cy.get('input[name="payment_code"]').type("289");
    cy.get('input[name="purpose"]').type("Uplata za usluge");

    cy.get(".pay-btn-submit").click();

    cy.get(".totp-overlay").should("be.visible");
    cy.get(".totp-input").should("exist");
    cy.get(".totp-btn-confirm").should("exist");
    cy.get(".totp-btn-cancel").should("exist");
  });

  it("šalje POST /transactions/payment sa tačnim payload-om i TOTP headerom", () => {
    cy.intercept("POST", "**/api/transactions/payment", {
      statusCode: 200,
      body: { message: "ok" },
    }).as("paymentRequest");

    cy.get('input[name="sender_account"]').type("265-0000000011234-56");
    cy.get('input[name="recipient_account"]').type("265-0000000099876-12");
    cy.get('input[name="recipient_name"]').type("Petar Nikolić");
    cy.get('input[name="amount"]').type("1500");
    cy.get('input[name="payment_code"]').type("289");
    cy.get('input[name="reference_number"]').type("97-12345678");
    cy.get('input[name="purpose"]').type("Uplata za usluge");

    cy.get(".pay-btn-submit").click();

    cy.get(".totp-input").type("123456");
    cy.get(".totp-btn-confirm").click();

    cy.wait("@paymentRequest").then((interception) => {
      // Provera URL-a (singular, ne plural)
      expect(interception.request.url).to.include("/transactions/payment");
      expect(interception.request.url).to.not.include("/transactions/payments");

      // Provera TOTP headera
      expect(interception.request.headers).to.have.property("totp", "123456");

      // Provera payload-a
      const body = interception.request.body;
      expect(body.sender_account).to.eq("265-0000000011234-56");
      expect(body.recipient_account).to.eq("265-0000000099876-12");
      expect(body.recipient_name).to.eq("Petar Nikolić");
      expect(body.amount).to.eq(1500);
      expect(body.payment_code).to.eq("289");
      expect(body.reference_number).to.eq("97-12345678");
      expect(body.purpose).to.eq("Uplata za usluge");
    });
  });

  it("prikazuje success poruku nakon uspešnog plaćanja", () => {
    cy.intercept("POST", "**/api/transactions/payment", {
      statusCode: 200,
      body: { message: "ok" },
    }).as("paymentRequest");

    cy.get('input[name="sender_account"]').type("265-0000000011234-56");
    cy.get('input[name="recipient_account"]').type("265-0000000099876-12");
    cy.get('input[name="recipient_name"]').type("Petar Nikolić");
    cy.get('input[name="amount"]').type("1000");
    cy.get('input[name="payment_code"]').type("289");
    cy.get('input[name="purpose"]').type("Test");

    cy.get(".pay-btn-submit").click();
    cy.get(".totp-input").type("123456");
    cy.get(".totp-btn-confirm").click();

    cy.wait("@paymentRequest");
    cy.get(".totp-overlay").should("not.exist");
    cy.get(".pay-success").should("contain", "uspešno");
  });

  it("prikazuje grešku u TOTP modalu pri neispravnom kodu", () => {
    cy.intercept("POST", "**/api/transactions/payment", {
      statusCode: 403,
      body: { error: "Invalid TOTP code" },
    }).as("paymentRequest");

    cy.get('input[name="sender_account"]').type("265-0000000011234-56");
    cy.get('input[name="recipient_account"]').type("265-0000000099876-12");
    cy.get('input[name="recipient_name"]').type("Petar Nikolić");
    cy.get('input[name="amount"]').type("1000");
    cy.get('input[name="payment_code"]').type("289");
    cy.get('input[name="purpose"]').type("Test");

    cy.get(".pay-btn-submit").click();
    cy.get(".totp-input").type("000000");
    cy.get(".totp-btn-confirm").click();

    cy.wait("@paymentRequest");
    cy.get(".totp-overlay").should("be.visible");
    cy.get(".totp-error").should("contain", "Invalid TOTP code");
  });

  it("zatvara TOTP modal na Otkaži", () => {
    cy.get('input[name="sender_account"]').type("265-0000000011234-56");
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
