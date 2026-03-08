const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'authUser';

export function setAuthData({ tokens, user }) {
  if (tokens?.access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  }
  if (tokens?.refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function setTokens(tokens) {
  if (tokens?.access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  }
  if (tokens?.refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || null;
}

export function clearAuthData() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}