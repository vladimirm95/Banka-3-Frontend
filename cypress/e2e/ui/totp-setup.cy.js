describe("TotpSetupPage", () => {
  beforeEach(() => {
    cy.loginBypass();
    cy.visit("/verify");
  });

  it("prikazuje početnu stranicu sa dugmetom za podešavanje", () => {
    cy.contains("Dvostepena verifikacija").should("be.visible");
    cy.contains("Započni podešavanje").should("be.visible");
  });

  it("poziva POST /totp/setup/begin i prikazuje QR kod", () => {
    cy.intercept("POST", "**/api/totp/setup/begin", {
      statusCode: 202,
      body: { url: "otpauth://totp/Banka3:test@test.com?secret=JBSWY3DPEHPK3PXP&issuer=Banka3" },
    }).as("totpBegin");

    cy.contains("Započni podešavanje").click();

    cy.wait("@totpBegin");
    cy.get(".totp-setup-qr-wrapper svg").should("exist");
    cy.contains("Nastavi").should("be.visible");
  });

  it("prelazi na fazu potvrde koda nakon klika na Nastavi", () => {
    cy.intercept("POST", "**/api/totp/setup/begin", {
      statusCode: 202,
      body: { url: "otpauth://totp/Banka3:test@test.com?secret=JBSWY3DPEHPK3PXP&issuer=Banka3" },
    }).as("totpBegin");

    cy.contains("Započni podešavanje").click();
    cy.wait("@totpBegin");

    cy.get(".totp-setup-btn-primary").contains("Nastavi").click();

    cy.get(".totp-setup-code-input").should("exist");
    cy.contains("Potvrdi").should("be.visible");
  });

  it("šalje POST /totp/setup/confirm sa tačnim payload-om", () => {
    cy.intercept("POST", "**/api/totp/setup/begin", {
      statusCode: 202,
      body: { url: "otpauth://totp/Banka3:test@test.com?secret=JBSWY3DPEHPK3PXP&issuer=Banka3" },
    }).as("totpBegin");

    cy.intercept("POST", "**/api/totp/setup/confirm", {
      statusCode: 200,
      body: { message: "TOTP enabled" },
    }).as("totpConfirm");

    cy.contains("Započni podešavanje").click();
    cy.wait("@totpBegin");
    cy.get(".totp-setup-qr-wrapper svg").should("exist");
    cy.get(".totp-setup-btn-primary").contains("Nastavi").click();

    cy.get(".totp-setup-code-input").type("123456");
    cy.contains("Potvrdi").click();

    cy.wait("@totpConfirm").then((interception) => {
      expect(interception.request.body).to.deep.equal({ code: "123456" });
    });
  });

  it("prikazuje success poruku nakon uspešne potvrde", () => {
    cy.intercept("POST", "**/api/totp/setup/begin", {
      statusCode: 202,
      body: { url: "otpauth://totp/Banka3:test@test.com?secret=JBSWY3DPEHPK3PXP&issuer=Banka3" },
    }).as("totpBegin");

    cy.intercept("POST", "**/api/totp/setup/confirm", {
      statusCode: 200,
      body: { message: "TOTP enabled" },
    }).as("totpConfirm");

    cy.contains("Započni podešavanje").click();
    cy.wait("@totpBegin");
    cy.get(".totp-setup-qr-wrapper svg").should("exist");
    cy.get(".totp-setup-btn-primary").contains("Nastavi").click();
    cy.get(".totp-setup-code-input").type("123456");
    cy.contains("Potvrdi").click();

    cy.wait("@totpConfirm");
    cy.get(".totp-setup-success").should("contain", "uspešno aktivirana");
  });

  it("prikazuje grešku pri neispravnom kodu", () => {
    cy.intercept("POST", "**/api/totp/setup/begin", {
      statusCode: 202,
      body: { url: "otpauth://totp/Banka3:test@test.com?secret=JBSWY3DPEHPK3PXP&issuer=Banka3" },
    }).as("totpBegin");

    cy.intercept("POST", "**/api/totp/setup/confirm", {
      statusCode: 400,
      body: { error: "Neispravan kod" },
    }).as("totpConfirm");

    cy.contains("Započni podešavanje").click();
    cy.wait("@totpBegin");
    cy.get(".totp-setup-qr-wrapper svg").should("exist");
    cy.get(".totp-setup-btn-primary").contains("Nastavi").click();
    cy.get(".totp-setup-code-input").type("000000");
    cy.contains("Potvrdi").click();

    cy.wait("@totpConfirm");
    cy.get(".totp-setup-error").should("contain", "Neispravan kod");
  });
});
