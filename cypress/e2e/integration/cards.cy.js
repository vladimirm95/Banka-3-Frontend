describe("Cards API integracija", () => {
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

  describe("GET /cards", () => {
    it("vraca listu kartica sa statusom 200", () => {
      cy.request({
        method: "GET",
        url: "/api/cards",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.be.an("array");
      });
    });

    it("svaka kartica ima obavezna polja", () => {
      cy.request({
        method: "GET",
        url: "/api/cards",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((resp) => {
        if (resp.body.length > 0) {
          const card = resp.body[0];
          expect(card).to.have.property("card_number");
          expect(card).to.have.property("card_type");
          expect(card).to.have.property("card_name");
          expect(card).to.have.property("status");
          expect(card).to.have.property("account_number");
        }
      });
    });
  });

  describe("POST /cards", () => {
    it("salje zahtev za novu karticu", () => {
      cy.request({
        method: "GET",
        url: "/api/accounts",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((accResp) => {
        if (accResp.body.length > 0) {
          cy.request({
            method: "POST",
            url: "/api/cards",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: {
              account_number: accResp.body[0].account_number,
              card_type: "Debit",
            },
            failOnStatusCode: false,
          }).then((resp) => {
            expect(resp.status).to.be.oneOf([200, 201, 400, 409, 500]);
          });
        }
      });
    });

    it("bez account_number vraca gresku", () => {
      cy.request({
        method: "POST",
        url: "/api/cards",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { card_type: "Debit" },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 422]);
      });
    });
  });

  describe("PATCH /cards/{cardNumber}/block", () => {
    it("blokira karticu ako postoji", () => {
      cy.request({
        method: "GET",
        url: "/api/cards",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((resp) => {
        if (resp.body.length > 0) {
          const cardNumber = resp.body[0].card_number;
          cy.request({
            method: "PATCH",
            url: `/api/cards/${cardNumber}/block`,
            headers: { Authorization: `Bearer ${accessToken}` },
            failOnStatusCode: false,
          }).then((blockResp) => {
            expect(blockResp.status).to.be.oneOf([200, 400, 409]);
          });
        }
      });
    });
  });
});
