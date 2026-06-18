import { CONFIG, resolveApiUrl } from '@/lib/config';
import { handleInvalidToken, shouldRedirectForUnauthorized } from '@/lib/authSession';

// 간단한 fetch 래퍼: 쿠키 세션 or JWT 지원
export type HttpOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown; // JSON 직렬화 대상 또는 문자열
  authToken?: string; // JWT 모드
  withCredentials?: boolean; // 세션 쿠키 모드
  csrfToken?: string;
  unwrapEnvelope?: boolean;
  redirectOnUnauthorized?: boolean;
};

const defaultHeaders = { 'Content-Type': 'application/json' };

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  code?: string;
  status?: number;
  data?: T;
};

type TokenRefreshResponse = {
  success?: boolean;
  accessToken?: string;
  token?: string;
  data?: {
    accessToken?: string;
    token?: string;
  };
};

function getTokenExpiresAt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return 0;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : Number.MAX_SAFE_INTEGER;
  } catch {
    return 0;
  }
}

function getValidAccessToken() {
  const token = localStorage.getItem('token') ?? '';
  if (!token) return '';
  return getTokenExpiresAt(token) > Date.now() ? token : '';
}

async function refreshAccessToken() {
  if (CONFIG.authMode !== 'token') return '';

  const refreshToken = localStorage.getItem('refreshToken') ?? '';
  if (!refreshToken) return '';

  const res = await fetch(resolveApiUrl('/api/v1/auth/iam/token/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return '';

  const payload = (await res.json().catch(() => null)) as TokenRefreshResponse | null;
  if (!payload || payload.success === false) return '';

  const token =
    payload.data?.accessToken || payload.data?.token || payload.accessToken || payload.token || '';
  if (!token || getTokenExpiresAt(token) <= Date.now()) return '';

  localStorage.setItem('token', token);
  localStorage.setItem('token_expiry', String(getTokenExpiresAt(token)));
  return token;
}

async function resolveAccessToken(explicitToken?: string) {
  if (CONFIG.authMode !== 'token') return explicitToken;
  return explicitToken || getValidAccessToken() || (await refreshAccessToken()) || undefined;
}

async function parseErrorResponse(res: Response, isJson: boolean) {
  if (isJson) {
    const payload = (await res.json().catch(() => null)) as ApiEnvelope<unknown> | null;
    const message = (payload && typeof payload.message === 'string' && payload.message) || '';
    const code = (payload && typeof payload.code === 'string' && payload.code) || '';
    const status = (payload && typeof payload.status === 'number' && payload.status) || res.status;
    return new Error(`HTTP ${status}${code ? ` ${code}` : ''}${message ? `: ${message}` : ''}`);
  }

  const text = await res.text().catch(() => '');
  return new Error(text || `HTTP ${res.status}`);
}

export async function http<T>(url: string, opt: HttpOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...(opt.headers || {}),
  };
  const resolvedToken = await resolveAccessToken(opt.authToken);
  if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;
  if (opt.csrfToken) headers['X-CSRF-Token'] = opt.csrfToken;

  const useCredentials =
    opt.withCredentials !== undefined ? opt.withCredentials : CONFIG.authMode === 'session';

  const request = (requestHeaders: Record<string, string>) =>
    fetch(resolveApiUrl(url), {
      method: opt.method || 'GET',
      headers: requestHeaders,
      credentials: useCredentials ? 'include' : 'same-origin',
      body: opt.body
        ? typeof opt.body === 'string'
          ? opt.body
          : JSON.stringify(opt.body)
        : undefined,
    });

  let res = await request(headers);

  if (res.status === 401 && CONFIG.authMode === 'token' && !opt.authToken) {
    const retryToken = await refreshAccessToken();
    if (retryToken) {
      res = await request({ ...headers, Authorization: `Bearer ${retryToken}` });
    }
  }

  const ct = res.headers.get('content-type');
  const isJson = ct?.includes('application/json');
  const shouldUnwrapEnvelope = opt.unwrapEnvelope !== false;

  if (!res.ok) {
    if (
      res.status === 401 &&
      opt.redirectOnUnauthorized !== false &&
      shouldRedirectForUnauthorized()
    ) {
      handleInvalidToken();
      return new Promise<T>(() => {});
    }

    throw await parseErrorResponse(res, Boolean(isJson));
  }

  if (!isJson) {
    return (await res.text()) as T;
  }

  const payload = (await res.json()) as ApiEnvelope<T> | T;
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.success === false) {
      throw new Error(envelope.message || '요청 처리에 실패했습니다.');
    }
    if (shouldUnwrapEnvelope) {
      return envelope.data as T;
    }
  }

  return payload as T;
}
