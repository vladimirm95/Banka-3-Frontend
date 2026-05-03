import { getPermissions } from "../services/AuthService";

export function hasPermission(name) {
  const perms = getPermissions();
  if (perms.includes("admin")) return true;
  return perms.includes(name);
}

export function isSupervisor() {
  return hasPermission("supervisor");
}

export function isAdmin() {
  return getPermissions().includes("admin");
}
