describe("Kreiranje zaposlenog", () => {
  beforeEach(() => {
    cy.visitAsEmployee("/employees/create");
  });

  it("stranica se ucitava sa formom", () => {
    cy.contains("h1", "Napravi novog korisnika");
  });

  it("forma sadrzi sva polja", () => {
    cy.get('input[name="ime"]').should("exist");
    cy.get('input[name="prezime"]').should("exist");
    cy.get('select[name="pol"]').should("exist");
    cy.get('input[name="username"]').should("exist");
    cy.get('input[name="adresa"]').should("exist");
    cy.get('input[name="telefon"]').should("exist");
    cy.get('input[name="datum"]').should("exist");
    cy.get('input[name="email"]').should("exist");
    cy.get('input[name="pozicija"]').should("exist");
    cy.get('input[name="department"]').should("exist");
  });

  it("validacija - prazna polja prikazuju greske", () => {
    cy.get('button[type="submit"]').click();
    cy.get(".error-msg").should("have.length.at.least", 1);
  });

  it("uspesno kreiranje prikazuje poruku", () => {
    cy.intercept("POST", "**/api/employees", {
      statusCode: 201,
      body: { id: 99 },
    }).as("createEmployee");

    popuniFormu({
      ime: "Marko",
      prezime: "Markovic",
      pol: "M",
      username: "markom",
      adresa: "Beograd, Srbija",
      telefon: "+381641234567",
      datum: "15.05.1990",
      email: "marko@primer.rs",
      pozicija: "Analiticar",
      department: "Rizik",
    });

    cy.get('button[type="submit"]').click();

    cy.wait("@createEmployee").its("request.body").should((body) => {
      expect(body.first_name).to.eq("Marko");
      expect(body.last_name).to.eq("Markovic");
      expect(body.gender).to.eq("M");
      expect(body.department).to.eq("Rizik");
    });
    cy.get(".success-msg").should("contain", "Zaposleni uspešno kreiran");
  });

  it("prikazuje sekciju sa permisijama", () => {
    cy.get(".permissions-section").should("exist");
    cy.get(".permissions-label").should("contain", "PERMISIJE");
    cy.get(".permission-checkbox").should("have.length", 5);
  });

  it("permisije sadrze sve ocekivane opcije", () => {
    cy.get(".permission-text").then(($labels) => {
      const texts = [...$labels].map((el) => el.textContent.trim());
      expect(texts).to.include("Admin");
      expect(texts).to.include("Trgovanje akcijama");
      expect(texts).to.include("Pregled akcija");
      expect(texts).to.include("Upravljanje ugovorima");
      expect(texts).to.include("Upravljanje osiguranjima");
    });
  });

  it("toggle permisije checkbox", () => {
    cy.get(".permission-checkbox").first().click();
    cy.get(".permission-checkbox").first().find('input[type="checkbox"]').should("be.checked");
    cy.get(".permission-checkbox").first().click();
    cy.get(".permission-checkbox").first().find('input[type="checkbox"]').should("not.be.checked");
  });

  it("uspesno kreiranje sa permisijama salje update poziv", () => {
    cy.intercept("POST", "**/api/employees", {
      statusCode: 201,
      body: { id: 99 },
    }).as("createEmployee");

    cy.intercept("GET", "**/api/employees*", (req) => {
      if (req.query.email === "marko@primer.rs") {
        req.reply({
          statusCode: 200,
          body: [{ id: 99, email: "marko@primer.rs" }],
        });
        return;
      }

      req.reply({ statusCode: 200, body: [] });
    }).as("findEmployee");

    cy.intercept("PATCH", "**/api/employees/99", {
      statusCode: 200,
      body: { id: 99 },
    }).as("updatePermissions");

    popuniFormu({
      ime: "Marko",
      prezime: "Markovic",
      pol: "M",
      username: "markom",
      adresa: "Beograd, Srbija",
      telefon: "+381641234567",
      datum: "15.05.1990",
      email: "marko@primer.rs",
      pozicija: "Analiticar",
      department: "Rizik",
    });

    cy.get(".permission-checkbox").eq(0).click();
    cy.get(".permission-checkbox").eq(2).click();
    cy.get('button[type="submit"]').click();

    cy.wait("@createEmployee");
    cy.wait("@findEmployee");
    cy.wait("@updatePermissions").its("request.body").should((body) => {
      expect(body.permissions).to.deep.equal(["admin", "view_stocks"]);
    });
    cy.get(".success-msg").should("contain", "Zaposleni uspešno kreiran");
  });

  it("kreiranje bez permisija ne salje update poziv", () => {
    cy.intercept("POST", "**/api/employees", {
      statusCode: 201,
      body: { id: 100 },
    }).as("createEmployee");

    cy.intercept("PATCH", "**/api/employees/**").as("updateEmployee");

    popuniFormu({
      ime: "Ana",
      prezime: "Anic",
      pol: "Z",
      username: "anaa",
      adresa: "Novi Sad",
      telefon: "+381649876543",
      datum: "20.03.1995",
      email: "ana@primer.rs",
      pozicija: "Menadzer",
      department: "Operativa",
    });

    cy.get('button[type="submit"]').click();
    cy.wait("@createEmployee");
    cy.get(".success-msg").should("contain", "Zaposleni uspešno kreiran");
    cy.get("@updateEmployee.all").should("have.length", 0);
  });

  it("prikazuje upozorenje kad update permisija padne", () => {
    cy.intercept("POST", "**/api/employees", {
      statusCode: 201,
      body: { id: 101 },
    }).as("createEmployee");

    cy.intercept("GET", "**/api/employees*", (req) => {
      if (req.query.email === "petar@primer.rs") {
        req.reply({
          statusCode: 200,
          body: [{ id: 101, email: "petar@primer.rs" }],
        });
        return;
      }

      req.reply({ statusCode: 200, body: [] });
    }).as("findEmployee");

    cy.intercept("PATCH", "**/api/employees/101", {
      statusCode: 500,
      body: { error: "Internal Server Error" },
    }).as("updatePermissions");

    popuniFormu({
      ime: "Petar",
      prezime: "Petrovic",
      pol: "M",
      username: "petarp",
      adresa: "Nis",
      telefon: "+381651234567",
      datum: "10.10.1988",
      email: "petar@primer.rs",
      pozicija: "Programer",
      department: "IT",
    });

    cy.get(".permission-checkbox").eq(1).click();
    cy.get('button[type="submit"]').click();

    cy.wait("@createEmployee");
    cy.wait("@findEmployee");
    cy.wait("@updatePermissions");
    cy.get(".success-msg").should("contain", "dodela permisija nije uspela");
  });
});

function popuniFormu(data) {
  cy.get('input[name="ime"]').type(data.ime);
  cy.get('input[name="prezime"]').type(data.prezime);
  cy.get('select[name="pol"]').select(data.pol);
  cy.get('input[name="username"]').type(data.username);
  cy.get('input[name="adresa"]').type(data.adresa);
  cy.get('input[name="telefon"]').type(data.telefon);
  cy.get('input[name="datum"]').type(data.datum);
  cy.get('input[name="email"]').type(data.email);
  cy.get('input[name="pozicija"]').type(data.pozicija);
  cy.get('input[name="department"]').type(data.department);
}
