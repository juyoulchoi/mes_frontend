import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { login, resolveRedirect } from '@/lib/auth';

/**
 * - 세션/토큰 모드 모두 지원
 * - CSRF 토큰 자동 첨부(meta[name="csrf-token"] 또는 XSRF-TOKEN 쿠키)
 * - 로그인 성공 시 ?redirect= 또는 /dashboard 로 이동
 *
 * 필요한 선행 조건
 * - react-router-dom 설치 및 BrowserRouter 래핑
 * - shadcn/ui: input, label, button, card 생성
 * - '@/app/auth'의 AuthProvider/useAuth 구성
 */

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname; // optional

  const onLogin = async () => {
    if (submitting) return;
    if (!userId.trim()) {
      setError('아이디를 입력하세요.');
      return;
    }
    if (!password.trim()) {
      setError('비밀번호를 입력하세요.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await login({ userId, password });
    setSubmitting(false);
    if (!res.ok) {
      setError(
        'error' in res
          ? (res.error ?? '로그인 처리 중 오류가 발생했습니다.')
          : '로그인 처리 중 오류가 발생했습니다.'
      );
      return;
    }

    navigate(resolveRedirect(from), { replace: true }); // 기본은 CONFIG.defaultRedirect로 수렴
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full mx-auto max-w-lg px-4">
          <Card className="shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">계정 로그인</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 오류 표시 */}
              <div aria-live="polite" className="mb-2 min-h-[1.25rem]">
                {error && (
                  <p role="alert" className="text-red-600 text-sm">
                    {error}
                  </p>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void onLogin();
                }}
                className="grid gap-4"
                noValidate
              >
                <div className="grid gap-1.5">
                  <Label htmlFor="userId">아이디</Label>
                  <Input
                    id="userId"
                    name="userId"
                    type="text"
                    placeholder="아이디"
                    autoComplete="userId"
                    maxLength={64}
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="비밀번호"
                    autoComplete="password"
                    maxLength={128}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex items-center justify-center">
                  <Button type="submit" disabled={submitting} className="px-5 disabled:opacity-100">
                    {submitting ? '로그인 중...' : '로그인'}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="text-sm text-gray-500 justify-center">MES System</CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
