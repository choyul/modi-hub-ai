import { ADMIN_TOKEN_KEY } from '../lib/adminToken';
import { supabase } from '../lib/supabaseClient';

/**
 * 관리자 API 호출 공통.
 *
 * 열쇠가 둘이다 — 로그인 계정(Supabase 세션)과 마스터키(ADMIN_TOKEN).
 * 계정으로 들어온 사람이 본류이고, 마스터키는 첫 관리자를 세우기 전이나
 * 계정을 잃었을 때를 위한 뒷문이다. 둘 다 보내고 서버가 판단하게 둔다.
 */
export async function adminFetch(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };

  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) headers['x-admin-token'] = token;

  const { data } = await supabase?.auth.getSession() ?? { data: null };
  const access = data?.session?.access_token;
  if (access) headers.Authorization = `Bearer ${access}`;

  const res = await fetch(path, { ...init, headers });
  let body: any = null;
  try { body = await res.json(); } catch { /* 본문이 없을 수 있다 */ }
  if (!res.ok) throw new Error(body?.error ?? '요청에 실패했습니다.');
  return body;
}
