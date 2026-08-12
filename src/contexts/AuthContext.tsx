/**
 * 인증 컨텍스트 — Supabase Auth 실계정 (AU-01·02)
 * 데모 계정 하드코딩을 대체한다. 검색·열람은 무인증, 신청 순간에만 로그인.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, authConfigured } from '../lib/supabaseClient';

interface AuthContextType {
  isLoggedIn: boolean;
  /** 표시용 이름 — 이메일 @ 앞부분 */
  userName: string | null;
  /** API 호출에 붙일 Bearer 토큰 */
  accessToken: string | null;
  loading: boolean;
  authConfigured: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Supabase 오류 문구를 한국어로 */
function toKorean(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return '이메일 또는 비밀번호가 일치하지 않습니다.';
  if (m.includes('already registered')) return '이미 가입된 이메일입니다. 로그인해 주세요.';
  if (m.includes('password should be at least')) return '비밀번호는 6자 이상이어야 합니다.';
  if (m.includes('valid email')) return '이메일 형식을 확인해 주세요.';
  if (m.includes('rate limit')) return '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.';
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!supabase) return '로그인 서비스가 설정되지 않았습니다.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? toKorean(error.message) : null;
  };

  /**
   * 가입은 서버(/api/signup)를 거친다.
   *
   * 브라우저에서 supabase.auth.signUp 을 직접 부르면 「이메일 확인」 설정에 걸려
   * 계정은 만들어지지만 로그인이 막힌다. 무료 프로젝트는 확인 메일이 사실상
   * 발송되지 않으므로, 가입 버튼은 있는데 아무도 끝내지 못하는 상태가 된다.
   * 서버에서 확인 처리까지 마친 뒤 곧바로 로그인시킨다.
   */
  const signUp = async (email: string, password: string) => {
    if (!supabase) return '로그인 서비스가 설정되지 않았습니다.';
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return body?.error ?? '가입에 실패했습니다.';
    } catch {
      return '가입 요청을 보내지 못했습니다. 네트워크를 확인해 주세요.';
    }
    // 가입 직후 바로 로그인 — 사용자가 같은 정보를 두 번 입력하지 않게 한다
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? toKorean(error.message) : null;
  };

  const logout = async () => {
    await supabase?.auth.signOut();
  };

  const email = session?.user?.email ?? null;
  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: Boolean(session),
        userName: email ? email.split('@')[0] : null,
        accessToken: session?.access_token ?? null,
        loading,
        authConfigured,
        login, signUp, logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
