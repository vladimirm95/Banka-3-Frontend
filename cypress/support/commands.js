Cypress.Commands.add(
  "seedSession",
  ({
    accessToken = "mock_access_token_123",
    refreshToken = "mock_refresh_token_123",
    userRole = "employee",
    permissions = ["admin"],
  } = {}) => {
    cy.window().then((win) => {
      win.sessionStorage.setItem("accessToken", accessToken);
      win.sessionStorage.setItem("refreshToken", refreshToken);
      win.sessionStorage.setItem("userRole", userRole);
      win.sessionStorage.setItem("permissions", JSON.stringify(permissions));
    });
  }
);

Cypress.Commands.add("loginBypass", () => {
  cy.window().then((win) => {
    win.sessionStorage.setItem("accessToken", "mock_access_token_123");
    win.sessionStorage.setItem("refreshToken", "mock_refresh_token_123");
  });
});

Cypress.Commands.add("visitAsEmployee", (path = "/employees", options = {}) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.sessionStorage.setItem("accessToken", "mock_access_token_123");
      win.sessionStorage.setItem("refreshToken", "mock_refresh_token_123");
      win.sessionStorage.setItem("userRole", "employee");
      win.sessionStorage.setItem("permissions", JSON.stringify(["admin"]));
    },
    ...options,
  });
});

Cypress.Commands.add("visitAsClient", (path = "/dashboard", options = {}) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.sessionStorage.setItem("accessToken", "mock_access_token_123");
      win.sessionStorage.setItem("refreshToken", "mock_refresh_token_123");
      win.sessionStorage.setItem("userRole", "client");
      win.sessionStorage.setItem("permissions", JSON.stringify([]));
    },
    ...options,
  });
});

Cypress.Commands.add("stubEmployeesList", (employees) => {
  cy.intercept("GET", "**/api/employees*", {
    statusCode: 200,
    body: employees,
  }).as("getEmployees");
});

Cypress.Commands.add("stubEmployeeDetails", (employee) => {
  cy.intercept("GET", `**/api/employees/${employee.id}`, {
    statusCode: 200,
    body: employee,
  }).as("getEmployee");
});

Cypress.Commands.add("loginWithBackend", (email = "jovana@primer.raf", password = "Test1234!") => {
  cy.request({
    method: "POST",
    url: "/api/login",
    body: { email, password },
  }).then((resp) => {
    const accessToken = resp.body.accessToken || resp.body.access_token;
    const refreshToken = resp.body.refreshToken || resp.body.refresh_token;
    
    cy.window().then((win) => {
      win.sessionStorage.setItem("accessToken", accessToken);
      win.sessionStorage.setItem("refreshToken", refreshToken);
    });
  });
});

Cypress.Commands.add("visitPayments", () => {
  cy.loginWithBackend();
  cy.visit("/payments");
});

Cypress.Commands.add("visitTransfer", () => {
  cy.loginWithBackend();
  cy.visit("/transfer");
});

Cypress.Commands.add("visitPayment", () => {
  cy.loginWithBackend();
  cy.visit("/payment");
});

Cypress.Commands.add("filterByStatus", (status) => {
  cy.contains(status).click();
  cy.get(".pp-filter-pill--active").should("contain", status);
});

Cypress.Commands.add("filterByType", (type) => {
  cy.contains(type).click();
});

Cypress.Commands.add("openTransactionDetail", (index = 0) => {
  cy.get(".pp-row").eq(index).click();
  cy.contains("Detalji plaćanja").should("be.visible");
});

Cypress.Commands.add("goBackToList", () => {
  cy.get(".pp-back-btn").click();
  cy.contains("Pregled plaćanja").should("be.visible");
});

Cypress.Commands.add("resetAllFilters", () => {
  cy.contains("Resetuj sve filtere").click();
  cy.get(".pp-filter-pill--active").should("contain", "Sve");
});
