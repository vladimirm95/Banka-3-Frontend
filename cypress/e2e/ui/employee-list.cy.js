const employees = [
  {
    id: 1,
    first_name: "Petar",
    last_name: "Petrovic",
    email: "petar@primer.rs",
    position: "Menadzer",
  },
  {
    id: 2,
    first_name: "Ana",
    last_name: "Anic",
    email: "ana@primer.rs",
    position: "Analiticar",
  },
  {
    id: 3,
    first_name: "Nikola",
    last_name: "Nikolic",
    email: "nikola@primer.rs",
    position: "Analiticar",
  },
  {
    id: 4,
    first_name: "Jelena",
    last_name: "Jelic",
    email: "jelena@primer.rs",
    position: "HR",
  },
];

describe("Lista zaposlenih", () => {
  beforeEach(() => {
    cy.stubEmployeesList(employees);
    cy.visitAsEmployee("/employees");
    cy.wait("@getEmployees");
  });

  it("employees stranica se ucitava sa heading-om", () => {
    cy.contains("h1", "Zaposleni");
    cy.contains("Pregled, pretraga i upravljanje zaposlenima u sistemu.");
  });

  it("tabela prikazuje zaposlene sa kolonama", () => {
    cy.get(".employee-table").should("be.visible");
    cy.get(".employee-table thead th").should("contain", "ID");
    cy.get(".employee-table thead th").should("contain", "Ime");
    cy.get(".employee-table thead th").should("contain", "Prezime");
    cy.get(".employee-table thead th").should("contain", "Email");
    cy.get(".employee-table thead th").should("contain", "Pozicija");
    cy.get(".employee-row").should("have.length", 4);
  });

  it("podaci zaposlenog su tacni", () => {
    cy.get(".employee-row")
      .first()
      .within(() => {
        cy.get("td").eq(1).should("contain", "Petar");
        cy.get("td").eq(2).should("contain", "Petrovic");
        cy.get("td").eq(3).should("contain", "petar@primer.rs");
        cy.get("td").eq(4).should("contain", "Menadzer");
      });
  });

  it("klik na red vodi na details stranicu", () => {
    cy.stubEmployeeDetails({
      id: 1,
      first_name: "Petar",
      last_name: "Petrovic",
      email: "petar@primer.rs",
      position: "Menadzer",
      active: true,
    });

    cy.get(".employee-row").first().find("td").first().click();
    cy.wait("@getEmployee");
    cy.url().should("include", "/employees/1");
  });

  it("search, filter, reset i add dugmad su vidljivi", () => {
    cy.get(".search").should("be.visible");
    cy.get(".position-filter").should("be.visible");
    cy.get(".reset-btn").should("be.visible");
    cy.get(".add-btn").should("be.visible");
  });

  it("filter info prikazuje tacan broj", () => {
    cy.get(".filter-info").should("contain", "4 / 4 zaposlenih");
  });
});
