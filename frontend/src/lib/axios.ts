import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

export const saveToken = (token: string): void => {
  localStorage.setItem('access_token', token);
};

export const clearTokens = (): void => {
  localStorage.removeItem('access_token');
};

export const getToken = (): string | null => {
  return localStorage.getItem('access_token');
};


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

interface QueueItem {
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((p) => {
    if (token) {
      p.resolve(token);
    } else {
      p.reject(error);
    }
  });
  failedQueue = [];
};

const dispatchForceLogout = (): void => {
  window.dispatchEvent(new Event('auth:force-logout'));
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/refresh')) {
      clearTokens();
      dispatchForceLogout();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // ── Bug fix: 401/422 loop after logout ───────────────────────────────
    // If the access token is already gone (user just logged out), there is
    // no point trying to refresh — the logout handler already cleared the
    // cookie via POST /auth/logout. Silently reject so background intervals
    // (fleet polling, expiry-docs, etc.) stop without triggering an infinite
    // refresh → 422 → force-logout → navigate → repeat cycle.
    if (!getToken() && !isRefreshing) {
      return Promise.reject(error);
    }
    // ────────────────────────────────────────────────────────────────────

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<{ access_token: string }>(
        `${import.meta.env.VITE_API_URL}/auth/refresh`,
        null,
        { withCredentials: true },
      );
      const newToken = data.access_token;

      saveToken(newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      dispatchForceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;