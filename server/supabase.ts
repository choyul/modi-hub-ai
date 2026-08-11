/**
 * Supabase 클라이언트 (서버 전용) — SB-01
 *
 * secret 키는 RLS 를 전부 우회한다. 이 파일을 브라우저 코드에서 import 하면
 * 키가 번들에 실려 나가므로, api/ 와 server/ 밖에서는 절대 쓰지 않는다.
 *
 * 브라우저에서 Supabase 를 쓰는 곳은 Auth(로그인) 하나뿐이며,
 * 그쪽은 publishable(anon) 키로 별도 클라이언트를 만든다.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL 또는 SUPABASE_SECRET_KEY 가 없습니다. .env.local 을 확인하세요.'
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** 저장소 연결 여부. 화면에 "임시 저장소" 배지를 띄울지 판단하는 데 쓴다 */
export const isSupabaseConfigured = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
);
