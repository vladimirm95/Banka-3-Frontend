Cypress.Commands.add(
  "seedSession",
  ({
    accessToken = "mock_access_token_123",
    refreshToken = "mock_refresh_token_123",
    userRole = "employee",
    permissions = ["admin"],
  } = {}) => {
    cy.window().then((win) => {
      win.localStorage.setItem("accessToken", accessToken);
      win.localStorage.setItem("refreshToken", refreshToken);
      win.localStorage.setItem("userRole", userRole);
      win.localStorage.setItem("permissions", JSON.stringify(permissions));
    });
  }
);

Cypress.Commands.add("loginBypass", () => {
  cy.window().then((win) => {
    win.localStorage.setItem("accessToken", "mock_access_token_123");
    win.localStorage.setItem("refreshToken", "mock_refresh_token_123");
  });
});

Cypress.Commands.add("visitAsEmployee", (path = "/employees", options = {}) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("accessToken", "mock_access_token_123");
      win.localStorage.setItem("refreshToken", "mock_refresh_token_123");
      win.localStorage.setItem("userRole", "employee");
      win.localStorage.setItem("permissions", JSON.stringify(["admin"]));
    },
    ...options,
  });
});

Cypress.Commands.add("visitAsClient", (path = "/dashboard", options = {}) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("accessToken", "mock_access_token_123");
      win.localStorage.setItem("refreshToken", "mock_refresh_token_123");
      win.localStorage.setItem("userRole", "client");
      win.localStorage.setItem("permissions", JSON.stringify([]));
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
