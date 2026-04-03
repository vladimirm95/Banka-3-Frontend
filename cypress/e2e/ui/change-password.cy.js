describe("Promena lozinke", () => {
  beforeEach(() => {
    cy.visit("/reset-password?token=test-token");
  });

  it("stranica se ucitava", () => {
    cy.contains("h1", "Postavite lozinku");
  });

  it("forma sadrzi dva password polja", () => {
    cy.get('input.cp-input[type="password"]').should("have.length", 2);
  });

  it("validacija - lozinke se ne poklapaju", () => {
    cy.get('input.cp-input[type="password"]').first().type("Test123!");
    cy.get('input.cp-input[type="password"]').last().type("Different1!");
    cy.get('button[type="submit"]').click();
    cy.get(".cp-error").should("contain", "Lozinke se ne poklapaju.");
  });

  it("validacija - slaba lozinka", () => {
    cy.get('input.cp-input[type="password"]').first().type("123");
    cy.get('input.cp-input[type="password"]').last().type("123");
    cy.get('button[type="submit"]').click();
    cy.get(".cp-error-box").should("be.visible");
  });

  it("uspesna promena lozinke", () => {
    cy.intercept("POST", "**/api/password-reset/confirm", {
      statusCode: 200,
      body: {},
    }).as("passwordReset");

    cy.get('input.cp-input[type="password"]').first().type("NewPass1!");
    cy.get('input.cp-input[type="password"]').last().type("NewPass1!");
    cy.get('button[type="submit"]').click();

    cy.wait("@passwordReset").its("request.body").should("deep.equal", {
      token: "test-token",
      password: "NewPass1!",
    });
    cy.get(".cp-success").should("contain", "Lozinka uspešno promenjena.");
  });
});
