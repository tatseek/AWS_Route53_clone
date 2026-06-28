import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (username: string, password: string) => {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  return api.post("/auth/login", form, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
};

export const getMe = () => api.get("/auth/me");

// Zones
export const listZones = (params: { search?: string; page?: number; page_size?: number }) =>
  api.get("/zones", { params });

export const createZone = (data: { name: string; type: string; comment: string }) =>
  api.post("/zones", data);

export const updateZone = (id: string, data: { comment?: string; type?: string }) =>
  api.patch(`/zones/${id}`, data);

export const deleteZone = (id: string) => api.delete(`/zones/${id}`);

export const getZone = (id: string) => api.get(`/zones/${id}`);

// Records
export const listRecords = (
  zoneId: string,
  params: { search?: string; type_filter?: string; page?: number; page_size?: number }
) => api.get(`/zones/${zoneId}/records`, { params });

export const createRecord = (
  zoneId: string,
  data: { name: string; type: string; ttl: number; value: string; routing_policy: string }
) => api.post(`/zones/${zoneId}/records`, data);

export const updateRecord = (
  zoneId: string,
  recordId: string,
  data: { name?: string; ttl?: number; value?: string; routing_policy?: string }
) => api.patch(`/zones/${zoneId}/records/${recordId}`, data);

export const deleteRecord = (zoneId: string, recordId: string) =>
  api.delete(`/zones/${zoneId}/records/${recordId}`);

export default api;
