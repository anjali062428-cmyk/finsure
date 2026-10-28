/**
 * FinSure Centralized API Client
 * Enforces:
 * - Deterministic base URL resolution
 * - Automatic Bearer token attachment
 * - Transparent 401 Refresh Token rotation
 * - Consistent typed error normalization
 * - Request correlation ID propagation
 */

import { ApiErrorResponse } from '../types/common';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1';

let authToken: string | null = localStorage.getItem('finsure_access_token');
let refreshToken: string | null = localStorage.getItem('finsure_refresh_token');

export const setAuthTokens = (access: string | null, refresh?: string | null) => {
  authToken = access;
  if (access) {
    localStorage.setItem('finsure_access_token', access);
  } else {
    localStorage.removeItem('finsure_access_token');
  }

  if (refresh !== undefined) {
    refreshToken = refresh;
    if (refresh) {
      localStorage.setItem('finsure_refresh_token', refresh);
    } else {
      localStorage.removeItem('finsure_refresh_token');
    }
  }
};

export const getAuthToken = () => authToken;
export const getRefreshToken = () => refreshToken;

export class ApiError extends Error {
  public status: number;
  public data: ApiErrorResponse;

  constructor(status: number, data: ApiErrorResponse) {
    super(data.message || `API Error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

/**
 * Universal fetch wrapper
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Correlation ID
  if (!headers.has('X-Request-ID')) {
    headers.set('X-Request-ID', `req_${Math.random().toString(36).substring(2, 11)}`);
  }

  // Bearer Token
  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  try {
    const response = await fetch(url, { ...options, headers });

    // Handle 401 Unauthorized with Refresh Token rotation
    if (response.status === 401 && refreshToken && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newAccess = data.access_token || data.tokens?.access_token;
            const newRefresh = data.refresh_token || data.tokens?.refresh_token || refreshToken;
            setAuthTokens(newAccess, newRefresh);
            isRefreshing = false;
            onRefreshed(newAccess);
          } else {
            setAuthTokens(null, null);
            isRefreshing = false;
            window.dispatchEvent(new CustomEvent('finsure:session-expired'));
            throw new ApiError(401, { error: 'SessionExpired', message: 'Session expired. Please log in again.' });
          }
        } catch (err) {
          setAuthTokens(null, null);
          isRefreshing = false;
          window.dispatchEvent(new CustomEvent('finsure:session-expired'));
          throw err;
        }
      }

      // Wait for refresh to complete and retry original request
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          headers.set('Authorization', `Bearer ${newToken}`);
          try {
            const retryRes = await fetch(url, { ...options, headers });
            if (!retryRes.ok) {
              const errJson = await retryRes.json().catch(() => ({}));
              reject(new ApiError(retryRes.status, {
                error: errJson.error || 'RequestFailed',
                message: errJson.detail || errJson.message || retryRes.statusText,
                status_code: retryRes.status,
              }));
              return;
            }
            resolve((await retryRes.json()) as T);
          } catch (retryErr) {
            reject(retryErr);
          }
        });
      });
    }

    // Handle other errors
    if (!response.ok) {
      let errorData: ApiErrorResponse;
      try {
        const json = await response.json();
        errorData = {
          error: json.error || 'ApiError',
          message: json.detail || json.message || response.statusText,
          details: json.details,
          request_id: json.request_id || response.headers.get('X-Request-ID') || undefined,
          status_code: response.status,
        };
      } catch {
        errorData = {
          error: 'HttpError',
          message: response.statusText || `Request failed with status ${response.status}`,
          status_code: response.status,
        };
      }
      throw new ApiError(response.status, errorData);
    }

    // Check for empty body / 204
    if (response.status === 204) {
      return {} as T;
    }

    // Check for binary downloads
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/pdf') || contentType.includes('application/zip') || contentType.includes('application/octet-stream')) {
      const blob = await response.blob();
      return blob as unknown as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or abort error
    throw new ApiError(0, {
      error: 'NetworkError',
      message: (error as Error).message || 'Unable to communicate with FinSure backend.',
      status_code: 0,
    });
  }
}
