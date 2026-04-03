describe("Izmena zaposlenog", () => {
  beforeEach(() => {
    cy.stubEmployeeDetails({
      id: 1,
      first_name: "Petar",
      last_name: "Petrovic",
      email: "petar@primer.rs",
      position: "Menadzer",
      active: true,
      gender: "M",
      phone_number: "+381601234567",
      address: "Knez Mihailova 1, Beograd",
      department: "Menadzment",
    });

    cy.intercept("PATCH", "**/api/employees/1", {
      statusCode: 200,
      body: { id: 1 },
    }).as("updateEmployee");

    cy.visitAsEmployee("/employees/edit/1");
    cy.wait("@getEmployee");
  });

  it("forma je popunjena postojecim podacima", () => {
    cy.get('input[name="prezime"]').should("have.value", "Petrovic");
    cy.get('input[name="pozicija"]').should("have.value", "Menadzer");
    cy.get('input[name="telefon"]').should("have.value", "+381601234567");
  });

  it("korisnik moze izmeniti podatke", () => {
    cy.get('input[name="prezime"]').clear().type("Novo Prezime");
    cy.get('button[type="submit"]').click();

    cy.wait("@updateEmployee").its("request.body").should((body) => {
      expect(body.last_name).to.eq("Novo Prezime");
      expect(body.department).to.eq("Menadzment");
    });
    cy.get(".success-msg").should("contain", "Profil uspešno izmenjen");
  });

  it("validacija pri praznim poljima", () => {
    cy.get('input[name="prezime"]').clear();
    cy.get('button[type="submit"]').click();
    cy.get(".error-msg").should("contain", "Prezime je obavezno.");
  });
});
