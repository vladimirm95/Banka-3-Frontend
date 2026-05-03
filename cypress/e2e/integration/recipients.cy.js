describe("Recipients API integracija", () => {
  let accessToken;

  before(() => {
    cy.task("db:reset", null, { timeout: 120_000 });
  });

  beforeEach(() => {
    cy.request({
      method: "POST",
      url: "/api/login",
      body: { email: "petar@primer.raf", password: "Test1234!" },
    }).then((resp) => {
      accessToken = resp.body.accessToken || resp.body.access_token;
    });
  });

  describe("GET /recipients", () => {
    it("vraca listu primalaca sa statusom 200", () => {
      cy.request({
        method: "GET",
        url: "/api/recipients",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.be.an("array");
      });
    });
  });

  describe("POST /recipients", () => {
    it("kreira novog primaoca", () => {
      const name = `Primalac-${Date.now()}`;
      cy.request({
        method: "POST",
        url: "/api/recipients",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { name, account_number: "333000009999900001" },
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 201]);
      });
    });
  });

  describe("PUT /recipients/{id}", () => {
    it("azurira postojeceg primaoca", () => {
      const name = `PutTest-${Date.now()}`;
      cy.request({
        method: "POST",
        url: "/api/recipients",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { name, account_number: "333000008888800001" },
      }).then(() => {
        cy.request({
          method: "GET",
          url: "/api/recipients",
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then((listResp) => {
          const recipient = listResp.body.find((r) => r.name === name);
          if (recipient) {
            cy.request({
              method: "PUT",
              url: `/api/recipients/${recipient.id}`,
              headers: { Authorization: `Bearer ${accessToken}` },
              body: { name: `${name}-updated`, account_number: "333000008888800001" },
              failOnStatusCode: false,
            }).then((updateResp) => {
              expect(updateResp.status).to.be.oneOf([200, 204]);
            });
          }
        });
      });
    });
  });

  describe("DELETE /recipients/{id}", () => {
    it("brise primaoca", () => {
      const name = `DelTest-${Date.now()}`;
      cy.request({
        method: "POST",
        url: "/api/recipients",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { name, account_number: "333000007777700001" },
      }).then(() => {
        cy.request({
          method: "GET",
          url: "/api/recipients",
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then((listResp) => {
          const recipient = listResp.body.find((r) => r.name === name);
          if (recipient) {
            cy.request({
              method: "DELETE",
              url: `/api/recipients/${recipient.id}`,
              headers: { Authorization: `Bearer ${accessToken}` },
              failOnStatusCode: false,
            }).then((delResp) => {
              expect(delResp.status).to.be.oneOf([200, 204]);
            });
          }
        });
      });
    });
  });
});
