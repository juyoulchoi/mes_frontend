import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, resolveRedirect } from '@/lib/auth';

export default function MMSM00001S() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!userId.trim()) {
      setError('아이디를 입력하세요.');
      return;
    }
    if (!password.trim()) {
      setError('비밀번호를 입력하세요.');
      return;
    }
    setSubmitting(true);
    const res = await login({ userId, password });
    setSubmitting(false);
    if (!res.ok) {
      setError(
        'error' in res
          ? res.error || '로그인 처리 중 오류가 발생했습니다.'
          : '로그인 처리 중 오류가 발생했습니다.'
      );
      return;
    }
    navigate(resolveRedirect(from), { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="border rounded-lg shadow-sm p-6 bg-background">
            <h2 className="text-2xl font-semibold text-center mb-6">Log In</h2>
            {error && (
              <div
                className="mb-3 text-sm text-destructive border border-destructive/30 rounded p-2"
                role="alert"
              >
                {error}
              </div>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="flex flex-col text-sm">
                <span className="mb-1">아이디</span>
                <input
                  type="text"
                  className="h-10 border rounded px-3"
                  placeholder="아이디"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="flex flex-col text-sm">
                <span className="mb-1">비밀번호</span>
                <input
                  type="password"
                  className="h-10 border rounded px-3"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <div className="pt-2 flex justify-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-5 border rounded bg-primary text-primary-foreground disabled:opacity-60"
                >
                  {submitting ? '로그인 중...' : '로그인'}
                </button>
              </div>
            </form>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-3">MES</div>
        </div>
      </main>
    </div>
  );
}
