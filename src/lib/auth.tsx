import { CONFIG } from '@/lib/config';
import { http } from '@/lib/http';

type LoginArgs = { userId: string; password: string };
type LoginApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    token?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  token?: string;
};

export function getCsrfToken(): string | null {
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
  if (meta?.content) return meta.content;
  // 2) 쿠키(XSRF-TOKEN) 사용 시
  const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function resolveRedirect(from?: string): string {
  // 절대경로만 허용
  if (!from || !from.startsWith('/')) return CONFIG.defaultRedirect;

  // 공개/인증 분리 설계라면 필요시 '/auth' 차단
  if (from.startsWith('/auth')) return CONFIG.defaultRedirect;

  // 우리 앱의 보호 영역만 허용
  if (from.startsWith('/app/')) return from;

  // 과거 호환: /pages/* 사용 중이면 그대로 허용
  // if (from.startsWith('/pages/')) return from;

  // 나머지는 기본 경로
  return CONFIG.defaultRedirect;
}

export async function login({
  userId,
  password,
}: LoginArgs): Promise<{ ok: true; token?: string } | { ok: false; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;

    const payload = await http<LoginApiResponse>(CONFIG.loginApi, {
      method: 'POST',
      headers,
      body: { userId, password },
      withCredentials: true,
      unwrapEnvelope: false,
      redirectOnUnauthorized: false,
    });

    if (payload.success !== true) {
      return { ok: false, error: payload.message || '로그인에 실패했습니다.' };
    }

    if (CONFIG.authMode === 'token') {
      const token =
        payload.data?.accessToken || payload.data?.token || payload.accessToken || payload.token;
      if (!token) return { ok: false, error: '토큰이 응답에 없습니다.' };
      localStorage.setItem('token', token);
      const refreshToken = payload.data?.refreshToken || payload.refreshToken;
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('token_expiry', String(Date.now() + 60 * 60 * 1000));
      return { ok: true, token };
    }

    // session 모드: 쿠키로 인증됨
    localStorage.setItem('token', 'session_ok'); // PrivateRoute 호환용 마커Promise
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
