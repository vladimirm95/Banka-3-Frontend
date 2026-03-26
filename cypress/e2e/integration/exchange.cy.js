describe("Exchange Rates API integracija", () => {
  let accessToken;

  beforeEach(() => {
    cy.request({
      method: "POST",
      url: "/api/login",
      body: { email: "petar@primer.raf", password: "Test1234!" },
    }).then((resp) => {
      accessToken = resp.body.accessToken || resp.body.access_token;
    });
  });

  describe("GET /exchange-rates", () => {
    it("vraca kursnu listu sa statusom 200", () => {
      cy.request({
        method: "GET",
        url: "/api/exchange-rates",
        headers: { Authorization: `Bearer ${accessToken}` },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it("bez autentifikacije vraca gresku", () => {
      cy.request({
        method: "GET",
        url: "/api/exchange-rates",
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403]);
      });
    });
  });
});
