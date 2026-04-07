describe("Blokiranje login nakon 3 neuspela pokušaja (#150)", () => {
  beforeEach(() => {
    // Counter persistira u sessionStorage — moramo ga ocistiti pre svakog testa
    if (typeof cy.clearAllSessionStorage === "function") {
      cy.clearAllSessionStorage();
    }
    cy.intercept("POST", "**/api/login", {
      statusCode: 401,
      body: { error: "invalid credentials" },
    }).as("loginFail");
  });

  const submitWrongLogin = () => {
    cy.get("#email").clear().type("wrong@email.com");
    cy.get("#password").clear().type("wrongpass");
    cy.get('button[type="submit"]').click();
    cy.wait("@loginFail");
  };

  it("nakon 3 neuspela pokušaja prikazuje poruku o prekoračenju i blokira dugme", () => {
    cy.visit("/login");

    submitWrongLogin();
    cy.get(".message").should("contain", "Pogrešan email ili lozinka");

    submitWrongLogin();
    cy.get(".message").should("contain", "Pogrešan email ili lozinka");

    submitWrongLogin();

    // Posle treceg neuspeha mora biti blokirano
    cy.get(".message").should("contain", "Prekoračen je broj pokušaja");
    cy.get(".message").should("contain", "kontaktirajte podršku");
    cy.get('button[type="submit"]').should("be.disabled");
  });

  it("posle 2 neuspela pokušaja dugme je još uvek aktivno", () => {
    cy.visit("/login");

    submitWrongLogin();
    submitWrongLogin();

    cy.get('button[type="submit"]').should("not.be.disabled");
    cy.get(".message").should("not.contain", "Prekoračen");
  });

  it("uspešan login resetuje brojač", () => {
    cy.visit("/login");

    // Dva neuspela pokušaja
    submitWrongLogin();
    submitWrongLogin();

    // Uspešan pokušaj
    cy.intercept("POST", "**/api/login", {
      statusCode: 200,
      body: {
        access_token: "tok",
        refresh_token: "ref",
        permissions: ["admin"],
      },
    }).as("loginOk");
    cy.intercept("GET", "**/api/employees*", { statusCode: 200, body: [] }).as("getEmployees");

    cy.get("#email").clear().type("admin@bank.rs");
    cy.get("#password").clear().type("Admin123!");
    cy.get('button[type="submit"]').click();
    cy.wait("@loginOk");
    cy.url().should("include", "/employees");
  });
});
