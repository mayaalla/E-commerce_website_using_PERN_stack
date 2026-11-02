import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { tokenStore } from './auth-token';
import { toApiError } from './api-error';

export const api = axios.create({
  baseURL: env.API_URL,
  withCredentials: true,            // sends the refreshToken cookie
  headers: { 'Content-Type': 'application/json' },
});

// 1) Attach the access token to every request
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 2) On 401, refresh once, then retry the original request
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: () => void) => { onSessionExpired = fn; };

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  // plain axios (NOT `api`) so this call can't trigger the interceptor again
  const { data } = await axios.post<{ accessToken: string }>(
    `${env.API_URL}/auth/refresh-token`, null, { withCredentials: true },
  );
  tokenStore.set(data.accessToken);
  return data.accessToken;
}

type Retriable = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as Retriable | undefined;
    const isAuthRoute = original?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        // single-flight: 5 parallel 401s share ONE refresh call
        refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null; });
        const token = await refreshPromise;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        tokenStore.set(null);
        onSessionExpired?.();       // the app decides: redirect to /login
      }
    }
    return Promise.reject(toApiError(error));
  },
);