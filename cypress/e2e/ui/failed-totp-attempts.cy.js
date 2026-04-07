describe("Blokiranje TOTP nakon 3 neuspela pokušaja (#150)", () => {
  const mockAccounts = [
    {
      account_number: "265-0000000011234-56",
      account_name: "Tekući račun",
      balance: 50000,
      currency: "RSD",
      account_type: "TEKUCI",
      status: "active",
    },
  ];

  function unesiTotpKod(code) {
    code.split("").forEach((digit, index) => {
      cy.get(".totp-input").eq(index).type(digit);
    });
  }

  function popuniIPosaljiFormu() {
    cy.get('select[name="sender_account"]').select("265-0000000011234-56");
    cy.get('input[name="recipient_account"]').type("265-0000000099876-12");
    cy.get('input[name="recipient_name"]').type("Petar Nikolić");
    cy.get('input[name="amount"]').type("1000");
    cy.get('input[name="payment_code"]').type("289");
    cy.get('input[name="purpose"]').type("Test");
    cy.get(".pay-btn-submit").click();
  }

  function pokusajPogresanKod() {
    cy.get(".totp-overlay").should("be.visible");
    // Ocistimo polja jer prethodni pokusaj ostavlja cifre u inputima
    cy.get(".totp-input").each(($el) => cy.wrap($el).clear());
    unesiTotpKod("000000");
    cy.get(".totp-btn-confirm").click();
    cy.wait("@paymentRequest");
  }

  beforeEach(() => {
    if (typeof cy.clearAllSessionStorage === "function") {
      cy.clearAllSessionStorage();
    }
    cy.loginBypass();

    cy.intercept("GET", "**/api/accounts*", { statusCode: 200, body: mockAccounts }).as("getAccounts");
    cy.intercept("GET", "**/api/recipients", { statusCode: 200, body: [] }).as("getRecipients");

    // Backend uvek vraca identicnu poruku — eksplicitno hvata bug #2
    cy.intercept("POST", "**/api/transactions/payment", {
      statusCode: 400,
      body: { error: "wrong code" },
    }).as("paymentRequest");
  });

  it("nakon 3 neuspela TOTP pokušaja prikazuje BLOCKED_MESSAGE i blokira submit", () => {
    cy.visit("/payment");
    cy.wait(["@getAccounts", "@getRecipients"]);

    popuniIPosaljiFormu();

    // Prvi neuspeh
    pokusajPogresanKod();
    cy.get(".totp-overlay").should("be.visible");

    // Drugi neuspeh
    pokusajPogresanKod();
    cy.get(".totp-overlay").should("be.visible");

    // Treci neuspeh — modal se zatvara, blokada aktivna
    pokusajPogresanKod();
    cy.get(".totp-overlay").should("not.exist");

    cy.contains("Prekoračen je broj pokušaja").should("be.visible");
    cy.get(".pay-btn-submit").should("be.disabled");
  });

  it("blokada perzistira posle reload-a (sessionStorage)", () => {
    cy.visit("/payment");
    cy.wait(["@getAccounts", "@getRecipients"]);

    popuniIPosaljiFormu();
    pokusajPogresanKod();
    pokusajPogresanKod();
    pokusajPogresanKod();

    cy.get(".pay-btn-submit").should("be.disabled");

    // Reload — counter mora da preziveti
    cy.reload();
    cy.wait(["@getAccounts", "@getRecipients"]);

    cy.get(".pay-btn-submit").should("be.disabled");
    cy.contains("Prekoračen je broj pokušaja").should("be.visible");
  });
});
