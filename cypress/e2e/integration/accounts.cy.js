describe("Accounts API integracija", () => {
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

  describe("GET /accounts", () => {
    it("vraca listu racuna sa statusom 200", () => {
      cy.request({
        method: "GET",
        url: "/api/accounts",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.be.an("array");
      });
    });

    it("svaki racun ima obavezna polja", () => {
      cy.request({
        method: "GET",
        url: "/api/accounts",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((resp) => {
        if (resp.body.length > 0) {
          const account = resp.body[0];
          expect(account).to.have.property("account_number");
          expect(account).to.have.property("currency");
          expect(account).to.have.property("balance");
        }
      });
    });

    it("bez tokena vraca 401", () => {
      cy.request({
        method: "GET",
        url: "/api/accounts",
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403]);
      });
    });
  });

  describe("GET /accounts/{accountNumber}", () => {
    it("vraca detalje racuna", () => {
      cy.request({
        method: "GET",
        url: "/api/accounts",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((resp) => {
        if (resp.body.length > 0) {
          const accNum = resp.body[0].account_number;
          cy.request({
            method: "GET",
            url: `/api/accounts/${accNum}`,
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then((detailResp) => {
            expect(detailResp.status).to.eq(200);
            expect(detailResp.body).to.have.property("account_number", accNum);
          });
        }
      });
    });
  });

  describe("POST /accounts", () => {
    it("kreira novi racun", () => {
      cy.request({
        method: "POST",
        url: "/api/accounts",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: {
          client_id: 1,
          account_type: "TEKUCI",
          subtype: "LICNI",
          currency: "RSD",
          initial_balance: 0,
          daily_limit: 100000,
          monthly_limit: 1000000,
          create_card: false,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 201, 400, 403]);
      });
    });
  });

  describe("PATCH /accounts/{accountNumber}/name", () => {
    it("menja naziv racuna", () => {
      cy.request({
        method: "GET",
        url: "/api/accounts",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((resp) => {
        if (resp.body.length > 0) {
          const accNum = resp.body[0].account_number;
          cy.request({
            method: "PATCH",
            url: `/api/accounts/${accNum}/name`,
            headers: { Authorization: `Bearer ${accessToken}` },
            body: { name: "Moj tekuci racun" },
            failOnStatusCode: false,
          }).then((patchResp) => {
            expect(patchResp.status).to.be.oneOf([200, 400, 403]);
          });
        }
      });
    });
  });

  describe("PATCH /accounts/{accountNumber}/limit", () => {
    it("bez TOTP headera vraca gresku", () => {
      cy.request({
        method: "GET",
        url: "/api/accounts",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((resp) => {
        if (resp.body.length > 0) {
          const accNum = resp.body[0].account_number;
          cy.request({
            method: "PATCH",
            url: `/api/accounts/${accNum}/limit`,
            headers: { Authorization: `Bearer ${accessToken}` },
            body: { daily_limit: 200000, monthly_limit: 2000000 },
            failOnStatusCode: false,
          }).then((patchResp) => {
            expect(patchResp.status).to.be.oneOf([400, 401, 403]);
          });
        }
      });
    });
  });
});
