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
  baseURL: 'http://localhost:8000',
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
        'http://localhost:8000/auth/refresh',
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