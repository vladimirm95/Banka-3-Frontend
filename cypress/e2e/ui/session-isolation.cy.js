describe("Izolacija sesija po tabu (#161)", () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.sessionStorage.clear();
      win.localStorage.clear();
    });
  });

  it("login cuva tokene u sessionStorage, ne localStorage", () => {
    cy.intercept("POST", "**/api/login", {
      statusCode: 200,
      body: {
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
        permissions: ["admin"],
      },
    }).as("loginRequest");
    cy.intercept("GET", "**/api/employees*", { statusCode: 200, body: [] });

    cy.visit("/login");
    cy.get("#email").type("admin@bank.rs");
    cy.get("#password").type("Admin123!");
    cy.get('button[type="submit"]').click();
    cy.wait("@loginRequest");

    cy.window().then((win) => {
      // Tokeni moraju biti u sessionStorage
      expect(win.sessionStorage.getItem("accessToken")).to.eq("mock_access_token");
      expect(win.sessionStorage.getItem("refreshToken")).to.eq("mock_refresh_token");
      expect(win.sessionStorage.getItem("userRole")).to.eq("employee");

      // localStorage mora biti prazan (nema tokena tamo)
      expect(win.localStorage.getItem("accessToken")).to.be.null;
      expect(win.localStorage.getItem("refreshToken")).to.be.null;
      expect(win.localStorage.getItem("userRole")).to.be.null;
    });
  });

  it("bez tokena u sessionStorage pristup zasticenim rutama preusmerava na login", () => {
    cy.visit("/employees");
    cy.url().should("include", "/login");
  });

  it("ciscenje sessionStorage (zatvaranje taba) odjavljuje korisnika", () => {
    cy.intercept("POST", "**/api/login", {
      statusCode: 200,
      body: {
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
        permissions: ["admin"],
      },
    }).as("loginRequest");
    cy.intercept("GET", "**/api/employees*", { statusCode: 200, body: [] });

    cy.visit("/login");
    cy.get("#email").type("admin@bank.rs");
    cy.get("#password").type("Admin123!");
    cy.get('button[type="submit"]').click();
    cy.wait("@loginRequest");
    cy.url().should("include", "/employees");

    // Simulacija zatvaranja taba — brisanje sessionStorage
    cy.window().then((win) => win.sessionStorage.clear());

    cy.visit("/employees");
    cy.url().should("include", "/login");
  });

  it("refresh token flow upisuje nove tokene u sessionStorage, ne localStorage", () => {
    // Pre-set session: simuliramo da je korisnik vec ulogovan sa starim tokenom
    cy.visit("/login");
    cy.window().then((win) => {
      win.sessionStorage.setItem("accessToken", "old_access_token");
      win.sessionStorage.setItem("refreshToken", "old_refresh_token");
      win.sessionStorage.setItem("userRole", "employee");
      win.sessionStorage.setItem("permissions", JSON.stringify(["admin"]));
    });

    // Prvi poziv /api/employees vraca 401 (token istekao),
    // interceptor u api.js ce pozvati /api/token/refresh pa retry-ovati.
    let employeesCallCount = 0;
    cy.intercept("GET", "**/api/employees*", (req) => {
      employeesCallCount++;
      if (employeesCallCount === 1) {
        req.reply({ statusCode: 401, body: { error: "token expired" } });
      } else {
        req.reply({ statusCode: 200, body: [] });
      }
    }).as("getEmployees");

    cy.intercept("POST", "**/api/token/refresh", {
      statusCode: 200,
      body: {
        access_token: "new_access_token",
        refresh_token: "new_refresh_token",
      },
    }).as("refreshToken");

    cy.visit("/employees");
    cy.wait("@refreshToken");

    cy.window().then((win) => {
      // Novi tokeni moraju biti u sessionStorage
      expect(win.sessionStorage.getItem("accessToken")).to.eq("new_access_token");
      expect(win.sessionStorage.getItem("refreshToken")).to.eq("new_refresh_token");

      // localStorage ostaje prazan
      expect(win.localStorage.getItem("accessToken")).to.be.null;
      expect(win.localStorage.getItem("refreshToken")).to.be.null;
    });
  });

  it("logout iz sidebar-a brise sessionStorage i preusmerava na login", () => {
    cy.intercept("POST", "**/api/login", {
      statusCode: 200,
      body: {
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
        permissions: ["admin"],
      },
    }).as("loginRequest");
    cy.intercept("GET", "**/api/employees*", { statusCode: 200, body: [] });
    cy.intercept("POST", "**/api/logout", { statusCode: 200, body: {} }).as("logoutRequest");

    cy.visit("/login");
    cy.get("#email").type("admin@bank.rs");
    cy.get("#password").type("Admin123!");
    cy.get('button[type="submit"]').click();
    cy.wait("@loginRequest");
    cy.url().should("include", "/employees");

    // Otvori sidebar meni i klikni "Odjavi se"
    cy.get(".menu-icon-btn").click();
    cy.contains(".sidepanel-logout", "Odjavi se").click();
    cy.wait("@logoutRequest");

    cy.url().should("include", "/login");
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem("accessToken")).to.be.null;
      expect(win.sessionStorage.getItem("refreshToken")).to.be.null;
      expect(win.sessionStorage.getItem("userRole")).to.be.null;
      expect(win.sessionStorage.getItem("permissions")).to.be.null;
      expect(win.localStorage.getItem("accessToken")).to.be.null;
    });
  });

  it("klijentski login cuva userRole kao client u sessionStorage", () => {
    cy.intercept("POST", "**/api/login", {
      statusCode: 200,
      body: {
        access_token: "client_token",
        refresh_token: "client_refresh",
        permissions: [],
      },
    }).as("clientLogin");
    cy.intercept("GET", "**/api/accounts*", { statusCode: 200, body: [] });
    cy.intercept("GET", "**/api/cards*", { statusCode: 200, body: [] });

    cy.visit("/login");
    cy.get("#email").type("klijent@bank.rs");
    cy.get("#password").type("Pass123!");
    cy.get('button[type="submit"]').click();
    cy.wait("@clientLogin");

    cy.window().then((win) => {
      expect(win.sessionStorage.getItem("userRole")).to.eq("client");
      expect(win.localStorage.getItem("userRole")).to.be.null;
    });
  });
});
