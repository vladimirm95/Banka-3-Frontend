// src/services/EmployeeService.js
import api from "./api.js";

// Pomoćna funkcija za pretvaranje Backend (snake_case) u Frontend (camelCase)
function normalizeEmployee(d) {
  if (!d) return null;
  return {
    id: d.id,
    firstName: d.first_name,
    lastName: d.last_name,
    email: d.email,
    position: d.position,
    phone: d.phone_number || d.phone,
    address: d.address,
    active: d.active,
    gender: d.gender,
    department: d.department,
    username: d.username,
    permissions: d.permissions || [],
    dateOfBirth: d.birth_date || d.date_of_birth || 0
  };
}

// 1. Dobijanje liste svih zaposlenih (sa opcionim filterima)
export async function getEmployees(params = {}) {
  const response = await api.get("/employees", { params });
  // Backend vraća ili niz direktno ili objekat { employees: [] }
  const data = response.data.employees ?? response.data;
  return Array.isArray(data) ? data.map(normalizeEmployee) : [];
}

// 2. Dobijanje jednog zaposlenog po ID-u
export async function getEmployeeById(id) {
  const response = await api.get(`/employees/${id}`);
  return normalizeEmployee(response.data);
}

// 3. KREIRANJE novog zaposlenog
export async function createEmployee(data) {
  const response = await api.post("/employees", {
    first_name: data.firstName,
    last_name: data.lastName,
    birth_date: data.dateOfBirth,
    gender: data.gender,
    email: data.email,
    phone: data.phoneNumber,
    address: data.address,
    username: data.username,
    position: data.position,
    department: data.department,
  });
  return response.data;
}

// 4. AZURIRANJE postojećeg zaposlenog
export async function updateEmployee(id, data) {
  const response = await api.patch(`/employees/${id}`, {
    last_name: data.lastName,
    gender: data.gender,
    phone: data.phoneNumber,
    address: data.address,
    position: data.position,
    department: data.department,
    active: data.active,
    permissions: data.permissions,
  });
  return response.data;
}

// 5. BRISANJE zaposlenog
export async function deleteEmployee(id) {
  const response = await api.delete(`/employees/${id}`);
  return response.data;
}