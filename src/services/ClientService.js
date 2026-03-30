// src/services/ClientService.js
import api from "./api.js";

// Keširanje podataka o trenutnom klijentu
let clientCache = null;
let clientCacheEmail = null;

// Funkcija za mapiranje polja sa Backenda na Frontend standard
function normalizeClient(c) {
  if (!c) return null;
  return {
    id: c.id,
    firstName: c.first_name || c.FirstName,
    lastName: c.last_name || c.LastName,
    email: c.email || c.Email,
    phone: c.phone_number || c.PhoneNumber,
    address: c.address || c.Address,
    gender: c.gender || c.Gender,
    dateOfBirth: c.date_of_birth || c.DateOfBirth,
    username: c.username || ""
  };
}

export async function getClients() {
  const response = await api.get("/clients");
  const data = response.data.clients || response.data;
  return Array.isArray(data) ? data.map(normalizeClient) : [];
}

export async function getClientById(id) {
  const response = await api.get(`/clients/${id}`);
  return normalizeClient(response.data);
}

export async function getClientByEmail(email) {
  const response = await api.get("/clients", { params: { email } });
  const data = response.data.clients || response.data;
  if (Array.isArray(data) && data.length > 0) return normalizeClient(data[0]);
  // Backend ponekad vrati direktno jedan objekat umesto niza
  if (data && data.email === email) return normalizeClient(data);
  return null;
}

// Logika za keširanje koju koristi Dashboard da ne bi stalno zvao API
export async function getCurrentClient(email) {
  if (clientCache && clientCacheEmail === email) {
    return clientCache;
  }
  const client = await getClientByEmail(email);
  if (client) {
    clientCache = client;
    clientCacheEmail = email;
  }
  return client;
}

// OVO JE FUNKCIJA KOJA JE NEDOSTAJALA:
export function clearClientCache() {
  clientCache = null;
  clientCacheEmail = null;
}