describe("Exchange Rates API integracija", () => {
  let accessToken;

  beforeEach(() => {
    cy.request({
      method: "POST",
      url: "/api/login",
      body: { email: "jovana@primer.raf", password: "Test1234!" },
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

  describe("POST /transactions/transfer – konverzija valuta", () => {
    it("ruta prihvata from_account, to_account, amount i description", () => {
      cy.request({
        method: "GET",
        url: "/api/accounts",
        headers: { Authorization: `Bearer ${accessToken}` },
        failOnStatusCode: false,
      }).then((accountsResp) => {
        if (accountsResp.status !== 200 || accountsResp.body.length < 2) return;

        const [from, to] = accountsResp.body;
        cy.request({
          method: "POST",
          url: "/api/transactions/transfer",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: {
            from_account: from.account_number,
            to_account: to.account_number,
            amount: 1,
            description: "test konverzija",
          },
          failOnStatusCode: false,
        }).then((resp) => {
          // Očekujemo 200/201 ili poslovnu grešku (400/422), ne 404 ili 500
          expect(resp.status).to.not.eq(404);
          expect(resp.status).to.not.eq(405);
          expect(resp.status).to.be.lessThan(500);
        });
      });
    });

    it("bez autentifikacije vraca 401 ili 403", () => {
      cy.request({
        method: "POST",
        url: "/api/transactions/transfer",
        body: {
          from_account: "000000000000000000",
          to_account: "000000000000000001",
          amount: 1,
          description: "",
        },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403]);
      });
    });

    it("odgovor sadrzi ocekivana polja kada je transfer uspešan", () => {
      cy.request({
        method: "GET",
        url: "/api/accounts",
        headers: { Authorization: `Bearer ${accessToken}` },
        failOnStatusCode: false,
      }).then((accountsResp) => {
        if (accountsResp.status !== 200 || accountsResp.body.length < 2) return;

        const [from, to] = accountsResp.body;
        cy.request({
          method: "POST",
          url: "/api/transactions/transfer",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: {
            from_account: from.account_number,
            to_account: to.account_number,
            amount: 1,
            description: "",
          },
          failOnStatusCode: false,
        }).then((resp) => {
          if (resp.status === 200 || resp.status === 201) {
            expect(resp.body).to.have.property("from_account");
            expect(resp.body).to.have.property("to_account");
            expect(resp.body).to.have.property("initial_amount");
            expect(resp.body).to.have.property("final_amount");
            expect(resp.body).to.have.property("currency");
            expect(resp.body).to.have.property("status");
          }
        });
      });
    });
  });
});
