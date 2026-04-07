const mockClients = [
  {
    id: 1,
    first_name: "Marko",
    last_name: "Marković",
    email: "marko@test.com",
  },
];

describe("CreateAccountPage – naziv računa", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/clients*", {
      statusCode: 200,
      body: mockClients,
    }).as("getClients");

    cy.visitAsEmployee("/accounts/create");
    cy.wait("@getClients");
  });

  it("prikazuje polje za naziv računa na formi", () => {
    cy.contains("Naziv računa").should("be.visible");
    cy.get('input[placeholder="npr. Moj tekući račun"]').should("exist");
  });

  it("polje za naziv računa je opciono i prihvata tekst", () => {
    cy.get('input[placeholder="npr. Moj tekući račun"]')
      .type("Moj štedni račun")
      .should("have.value", "Moj štedni račun");
  });

  it("šalje name u POST /accounts kada je naziv unet", () => {
    cy.intercept("POST", "**/api/accounts", {
      statusCode: 201,
      body: {
        account_number: "333000199999999999",
        account_name: "Moj štedni račun",
        balance: 0,
        currency: "RSD",
      },
    }).as("createAccount");

    // Popuni obavezna polja
    cy.get("select").first().select("1");
    cy.contains("Tekući račun").click();
    cy.contains("Fizičko lice").click();
    cy.contains("Standardni").click();

    // Unesi naziv računa
    cy.get('input[placeholder="npr. Moj tekući račun"]').type("Moj štedni račun");

    // Unesi početni iznos
    cy.get('input[placeholder="0.00"]').type("1000");

    cy.get('form').submit();

    cy.wait("@createAccount").then((interception) => {
      expect(interception.request.body).to.have.property("name", "Moj štedni račun");
    });
  });

  it("ne šalje name kada je polje za naziv prazno", () => {
    cy.intercept("POST", "**/api/accounts", {
      statusCode: 201,
      body: {
        account_number: "333000199999999998",
        account_name: "checking-standardni",
        balance: 0,
        currency: "RSD",
      },
    }).as("createAccount");

    cy.get("select").first().select("1");
    cy.contains("Tekući račun").click();
    cy.contains("Fizičko lice").click();
    cy.contains("Standardni").click();
    cy.get('input[placeholder="0.00"]').type("500");

    cy.get('form').submit();

    cy.wait("@createAccount").then((interception) => {
      // name treba biti undefined (ne u body-u) kada je polje prazno
      expect(interception.request.body.name).to.be.undefined;
    });
  });
});
