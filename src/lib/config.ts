const envApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

// Default to same-origin `/api` requests. In development this uses the Vite proxy,
// and in production it assumes the web server or gateway proxies `/api` to the backend.
const API_BASE_URL = (envApiBaseUrl || '').replace(/\/+$/g, '');

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export const CONFIG = {
  authMode: 'token' as 'session' | 'token', // 토큰 모드면 "token", 세션 모드면 "session"
  apiBaseUrl: API_BASE_URL,
  loginApi: resolveApiUrl('/api/v1/auth/login'), // 로그인 API 엔드포인트
  defaultRedirect: '/app/default.ts',
};
