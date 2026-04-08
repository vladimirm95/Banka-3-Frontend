import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : "/api";

const api = axios.create({ baseURL });

// Auth podaci se čuvaju u sessionStorage (ne localStorage) kako bi svaki tab
// imao izolovanu sesiju — sprečava koliziju kada su Admin i Klijent otvoreni u
// različitim tabovima istog brauzera (#161).
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/login") &&
      !originalRequest.url.includes("/token/refresh")
    ) {
      originalRequest._retry = true;

      const storedRefresh = sessionStorage.getItem("refreshToken");
      if (!storedRefresh) {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        sessionStorage.removeItem("userId");
        sessionStorage.removeItem("userRole");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await api.post("/token/refresh", {
          refresh_token: storedRefresh,
        });
        const newAccess = data.access_token || data.accessToken;
        const newRefresh = data.refresh_token || data.refreshToken;
        sessionStorage.setItem("accessToken", newAccess);
        sessionStorage.setItem("refreshToken", newRefresh);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        sessionStorage.removeItem("userId");
        sessionStorage.removeItem("userRole");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
