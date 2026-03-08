import { API_BASE_URL, ENDPOINTS } from './config';
import { getAccessToken, getRefreshToken, setTokens, clearAuthData } from '../utils/auth';

async function doFetch(url, options) {
  const res = await fetch(url, options);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const err = new Error(data?.detail || data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, auth = true, ...rest } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  let accessToken = getAccessToken();
  if (auth && accessToken) {
    finalHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const options = {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  };

  try {
    return await doFetch(url, options);
  } catch (error) {
    if (!auth || error.status !== 401) {
      throw error;
    }

    const refresh = getRefreshToken();
    if (!refresh) {
      clearAuthData();
      throw error;
    }

    // Try to refresh access token
    try {
      const refreshData = await doFetch(`${API_BASE_URL}${ENDPOINTS.refreshToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });

      if (refreshData?.access) {
        setTokens({ access: refreshData.access, refresh });
        const retryHeaders = {
          ...finalHeaders,
          Authorization: `Bearer ${refreshData.access}`,
        };
        return await doFetch(url, { ...options, headers: retryHeaders });
      }
    } catch {
      clearAuthData();
    }

    throw error;
  }
}

