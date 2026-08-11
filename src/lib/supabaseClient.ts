/**
 * 브라우저용 Supabase 클라이언트 — Auth(로그인) 전용.
 * anon(publishable) 키는 브라우저 노출을 전제로 설계된 키이며 RLS 가 보호한다.
 * 데이터 쓰기는 전부 우리 API(/api/*)를 거친다 — 마스킹·검증이 서버에 있다.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const authConfigured = Boolean(url && anonKey);

export const supabase = authConfigured
  ? createClient(url!, anonKey!)
  : null;
