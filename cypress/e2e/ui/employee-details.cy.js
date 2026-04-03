const employees = [
  {
    id: 1,
    first_name: "Petar",
    last_name: "Petrovic",
    email: "petar@primer.rs",
    position: "Menadzer",
  },
];

const employee = {
  id: 1,
  first_name: "Petar",
  last_name: "Petrovic",
  email: "petar@primer.rs",
  position: "Menadzer",
  active: true,
  username: "ppetrovic",
  address: "Knez Mihailova 1",
  phone_number: "+381601234567",
  department: "Menadzment",
  gender: "M",
  birth_date: "1990-05-15",
};

describe("Pregled zaposlenog", () => {
  beforeEach(() => {
    cy.stubEmployeesList(employees);
    cy.stubEmployeeDetails(employee);
  });

  it("klik na zaposlenog otvara details", () => {
    cy.visitAsEmployee("/employees");
    cy.wait("@getEmployees");

    cy.get(".employee-row").first().find("td").first().click();
    cy.wait("@getEmployee");
    cy.url().should("include", "/employees/1");
  });

  it("prikazuje podatke zaposlenog", () => {
    cy.visitAsEmployee("/employees/1");
    cy.wait("@getEmployee");

    cy.contains("Profil zaposlenog");
    cy.contains("Petar Petrovic");
    cy.contains("petar@primer.rs");
    cy.contains("Menadzment");
    cy.contains("Aktivan");
  });

  it("dugme Uredi profil vodi na edit stranicu", () => {
    cy.visitAsEmployee("/employees/1");
    cy.wait("@getEmployee");

    cy.contains("button", "Uredi profil").click();
    cy.url().should("include", "/employees/edit/1");
  });
});
