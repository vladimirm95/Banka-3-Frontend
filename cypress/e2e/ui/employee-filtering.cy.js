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

describe("Filtriranje zaposlenih", () => {
  beforeEach(() => {
    cy.stubEmployeesList(employees);
    cy.visitAsEmployee("/employees");
    cy.wait("@getEmployees");
    cy.get(".employee-row").should("have.length", 4);
  });

  it("search po imenu filtrira listu", () => {
    cy.get(".search").type("Petar");
    cy.get(".employee-row").should("have.length", 1).and("contain", "Petar");
  });

  it("search po emailu filtrira listu", () => {
    cy.get(".search").type("ana@");
    cy.get(".employee-row").should("have.length", 1).and("contain", "Ana");
  });

  it("filter po poziciji", () => {
    cy.get(".position-filter").select("Analiticar");
    cy.get(".employee-row").should("have.length", 2);
  });

  it("kombinacija search i position filter", () => {
    cy.get(".search").type("Nikola");
    cy.get(".position-filter").select("Analiticar");
    cy.get(".employee-row").should("have.length", 1).and("contain", "Nikola");
  });

  it("nema rezultata prikazuje poruku", () => {
    cy.get(".search").type("xyz");
    cy.get(".no-results").should("be.visible").and("contain", "Nema zaposlenih");
  });

  it("filter info se azurira", () => {
    cy.get(".search").type("Petar");
    cy.get(".filter-info").should("contain", "1 / 4 zaposlenih");
  });

  it("reset dugme resetuje filtere", () => {
    cy.get(".search").type("Petar");
    cy.get(".position-filter").select("Analiticar");
    cy.get(".reset-btn").click();

    cy.get(".employee-row").should("have.length", 4);
    cy.get(".search").should("have.value", "");
    cy.get(".position-filter").should("have.value", "");
  });

  it("search je case-insensitive", () => {
    cy.get(".search").type("petar");
    cy.get(".employee-row").should("have.length", 1).and("contain", "Petar");
  });
});
