import { clearMaskedPage } from '@/app/routeMask';

const INVALID_TOKEN_MESSAGE = '인증 토큰이 유효하지 않습니다. 다시 로그인해주세요.';

let handlingInvalidToken = false;

export function shouldRedirectForUnauthorized() {
  return true;
}

export function clearAuthStorage() {
  localStorage.removeItem('token');
  localStorage.removeItem('token_expiry');
  localStorage.removeItem('refreshToken');
  clearMaskedPage();
}

export function handleInvalidToken() {
  if (handlingInvalidToken) return;
  handlingInvalidToken = true;

  clearAuthStorage();

  if (window.location.pathname !== '/login') {
    window.alert(INVALID_TOKEN_MESSAGE);
    window.location.replace('/login');
    return;
  }

  handlingInvalidToken = false;
}
