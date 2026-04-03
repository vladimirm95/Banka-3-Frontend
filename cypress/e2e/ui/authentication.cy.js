describe("Autentifikacija", () => {
  it("login stranica se ucitava", () => {
    cy.visit("/login");

    cy.url().should("include", "/login");
    cy.contains("h1", "Banka");
    cy.contains("Prijavite se na vaš nalog");
  });

  it("login forma sadrzi email, password i dugme", () => {
    cy.visit("/login");

    cy.get("#email").should("be.visible");
    cy.get("#password").should("be.visible");
    cy.contains("button", "Prijavi se").should("be.visible");
  });

  it("ne moze se poslati prazna forma", () => {
    cy.visit("/login");

    cy.get('button[type="submit"]').click();
    cy.get(".message").should("contain", "Unesite email i lozinku");
  });

  it("uspesna prijava zaposlenog cuva sesiju i preusmerava na /employees", () => {
    cy.intercept("POST", "**/api/login", {
      statusCode: 200,
      body: {
        access_token: "mock_access_token_123",
        refresh_token: "mock_refresh_token_123",
        permissions: ["admin"],
      },
    }).as("loginRequest");

    cy.intercept("GET", "**/api/employees*", {
      statusCode: 200,
      body: [],
    }).as("getEmployees");

    cy.visit("/login");
    cy.get("#email").type("admin@bank.rs");
    cy.get("#password").type("Admin123!");
    cy.get('button[type="submit"]').click();

    cy.wait("@loginRequest");
    cy.wait("@getEmployees");
    cy.url().should("include", "/employees");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("accessToken")).to.eq("mock_access_token_123");
      expect(win.localStorage.getItem("refreshToken")).to.eq("mock_refresh_token_123");
      expect(win.localStorage.getItem("userRole")).to.eq("employee");
      expect(win.localStorage.getItem("permissions")).to.eq('["admin"]');
    });
  });

  it("neuspesna prijava prikazuje gresku", () => {
    cy.intercept("POST", "**/api/login", {
      statusCode: 401,
      body: { error: "invalid credentials" },
    }).as("loginFail");

    cy.visit("/login");
    cy.get("#email").type("wrong@email.com");
    cy.get("#password").type("wrongpass");
    cy.get('button[type="submit"]').click();

    cy.wait("@loginFail");
    cy.get(".message").should("contain", "Pogrešan email ili lozinka");
  });

  it("neulogovan korisnik ne moze pristupiti /employees", () => {
    cy.visit("/employees");

    cy.url().should("include", "/login");
  });
});
