import api from "./api.js";
import { clearClientCache } from "./ClientService.js";

export const login = async (email, password) => {
  const response = await api.post("/login", { email, password });
  
  return {
    accessToken: response.data.accessToken || response.data.access_token,
    refreshToken: response.data.refreshToken || response.data.refresh_token,
    userId: response.data.userId || response.data.user_id,
    permissions: response.data.permissions || [],
  };
};

export const logout = async () => {
  await api.post("/logout");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("userRole");
  sessionStorage.removeItem("permissions");
  clearClientCache();
};

export const refreshToken = async (refreshToken) => {
  const response = await api.post("/token/refresh", {
    refresh_token: refreshToken,
  });
  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
  };
};

export const requestPasswordReset = async (email) => {
  const response = await api.post("/password-reset/request", { email });
  return response.data;
};

export const confirmPasswordReset = async (token, newPassword) => {
  await api.post("/password-reset/confirm", {
    token,
    password: newPassword,
  });
};

export const getCurrentUserId = () => {
  return sessionStorage.getItem("userId");
};

export const getTokenPayload = () => {
  try {
    const token = sessionStorage.getItem("accessToken");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

export const getCurrentUserEmail = () => {
  return getTokenPayload()?.sub || null;
};

export const beginTotpSetup = async () => {
  const response = await api.post("/totp/setup/begin");
  return response.data;
};

export const confirmTotpSetup = async (code) => {
  const response = await api.post("/totp/setup/confirm", { code });
  return response.data;
};

export const getPermissions = () => {
  try {
    return JSON.parse(sessionStorage.getItem("permissions") || "[]");
  } catch {
    return [];
  }
};
