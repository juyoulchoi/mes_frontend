import type { NavigateFunction } from 'react-router-dom';

const MASK_KEY = 'maskedPage';
const DEFAULT_MASK = 'default';

function notifyMaskedChange(pageId: string) {
  try {
    const ev = new CustomEvent('maskedpagechange', { detail: { pageId } });
    window.dispatchEvent(ev);
  } catch {
    /* no-op */
  }
}

export function getMaskedPage(): string | null {
  try {
    return sessionStorage.getItem(MASK_KEY);
  } catch {
    return null;
  }
}

export function clearMaskedPage() {
  try {
    sessionStorage.removeItem(MASK_KEY);
  } catch {
    /* no-op: sessionStorage unavailable */
  }
  notifyMaskedChange(DEFAULT_MASK);
}

export function setMaskedPage(
  pageId: string,
  navigate: NavigateFunction,
  options?: { replace?: boolean }
) {
  try {
    sessionStorage.setItem(MASK_KEY, pageId);
  } catch {
    /* no-op: sessionStorage unavailable */
  }
  notifyMaskedChange(pageId);
  navigate('/app/default.ts', {
    replace: options?.replace ?? true,
    state: { maskedPage: pageId },
  });
}

export function ensureMaskedPage(
  navigate: NavigateFunction,
  initial?: string,
  replace: boolean = true
) {
  const target = getMaskedPage() || initial || DEFAULT_MASK;
  try {
    sessionStorage.setItem(MASK_KEY, target);
  } catch {
    /* no-op: sessionStorage unavailable */
  }
  notifyMaskedChange(target);
  navigate('/app/default.ts', {
    replace,
    state: { maskedPage: target },
  });
}
