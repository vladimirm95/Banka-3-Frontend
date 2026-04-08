describe("Transactions API integracija", () => {
  let accessToken;

  beforeEach(() => {
    cy.request({
      method: "POST",
      url: "/api/login",
      body: { email: "petar@primer.raf", password: "Test1234!" },
    }).then((resp) => {
      accessToken = resp.body.accessToken || resp.body.access_token;
      cy.window().then((win) => {
        win.sessionStorage.setItem("accessToken", accessToken);
        win.sessionStorage.setItem("refreshToken", resp.body.refreshToken || resp.body.refresh_token);
      });
    });
  });

  it("GET /api/transactions vraca listu transakcija", () => {
    cy.request({
      method: "GET",
      url: "/api/transactions",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.be.an("array");
    });
  });

  it("POST /api/transactions/payment bez TOTP headera vraca gresku", () => {
    cy.request({
      method: "POST",
      url: "/api/transactions/payment",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        sender_account: "333000112345678910",
        recipient_account: "333000198765432100",
        recipient_name: "Test",
        amount: 100,
        payment_code: "289",
        purpose: "Test",
      },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([400, 401, 403]);
    });
  });

  it("POST /api/transactions/transfer bez TOTP headera vraca gresku", () => {
    cy.request({
      method: "POST",
      url: "/api/transactions/transfer",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        from_account: "333000112345678910",
        to_account: "333000198765432100",
        amount: 100,
      },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([400, 401, 403]);
    });
  });
});
