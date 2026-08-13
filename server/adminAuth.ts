/**
 * 관리자 인증 — 누가 무엇을 할 수 있는가.
 *
 * 두 가지 열쇠를 받는다.
 *   1) Supabase 세션 (Authorization: Bearer …) — 사람마다 다른 계정. 이쪽이 본류다.
 *   2) ADMIN_TOKEN (x-admin-token) — 부트스트랩용. 첫 master 를 세우기 전에는
 *      아무도 로그인할 수 없으므로 문 하나는 열어 둬야 한다.
 *
 * 토큰 방식을 남겨 둔 이유를 분명히 해 둔다: 편해서가 아니라, 계정 체계가
 * 스스로를 만들 수 없기 때문이다. master 가 생기고 나면 일상 운영은 계정으로 한다.
 */
import { supabaseAdmin } from './supabase.js';

export type AdminRole = 'master' | 'admin';

export interface AdminIdentity {
  /** 로그인 계정으로 들어왔으면 그 사람, 부트스트랩 토큰이면 null */
  userId: string | null;
  email: string | null;
  role: AdminRole;
  /** 마스터키(ADMIN_TOKEN)로 들어왔는가 — 기록에 남긴다 */
  viaToken: boolean;
}

/**
 * 요청자를 확인한다. 관리자가 아니면 null.
 * @param need 'master' 면 마스터만 통과
 */
export async function requireAdmin(
  req: any,
  need: AdminRole = 'admin'
): Promise<AdminIdentity | null> {
  // ── 1) 부트스트랩 토큰 ──────────────────────────────────
  const master = process.env.ADMIN_TOKEN;
  if (master && req.headers['x-admin-token'] === master) {
    return { userId: null, email: null, role: 'master', viaToken: true };
  }

  // ── 2) 로그인 계정 ──────────────────────────────────────
  const auth = String(req.headers['authorization'] ?? '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;

  const sb = supabaseAdmin();
  const { data: userRes, error } = await sb.auth.getUser(token);
  const user = userRes?.user;
  if (error || !user) return null;

  const { data: row } = await sb
    .from('admin_users')
    .select('role, email')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!row) return null; // 로그인은 했지만 관리자가 아니다

  const role = row.role as AdminRole;
  if (need === 'master' && role !== 'master') return null;

  // 마지막 접속 시각 — 쓰지 않는 계정을 정리할 근거가 된다
  sb.from('admin_users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .then(() => {}, () => {});

  return { userId: user.id, email: row.email ?? user.email ?? null, role, viaToken: false };
}

/**
 * 관리자 행동을 남긴다.
 *
 * 실패해도 본 작업을 막지 않는다 — 기록이 안 남았다고 승인을 되돌릴 수는 없다.
 * 다만 조용히 넘기지 않고 서버 로그에 남겨 둔다.
 */
export async function logAction(
  who: AdminIdentity,
  action: string,
  target: string | null,
  detail: Record<string, unknown> = {}
) {
  try {
    await supabaseAdmin().from('admin_actions').insert({
      actor_id: who.userId,
      actor_email: who.email ?? (who.viaToken ? '(마스터키)' : null),
      action,
      target,
      detail,
    });
  } catch (e) {
    console.warn('[admin_actions] 기록 실패:', action, target, e);
  }
}

/** 권한 없음 응답 — 이유를 숨기지 않는다 */
export function deny(res: any, need: AdminRole = 'admin') {
  return res.status(401).json({
    error:
      need === 'master'
        ? '마스터 관리자만 할 수 있는 작업입니다.'
        : '관리자 인증이 필요합니다.',
  });
}
