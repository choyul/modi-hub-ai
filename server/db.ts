/**
 * Supabase 저장 계층 (서버 전용) — SB-06
 * store.ts(Upstash/메모리)를 대체한다. 원문은 반드시 scrub 을 거쳐 적재한다.
 */
import { supabaseAdmin } from './supabase.js';

export const isPersistent = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
);

/** 적재 단계 개인정보 자동 제거 (LG-02). IP·위치는 애초에 수집하지 않는다. */
export function scrub(text: string): string {
  return text
    .replace(/01[016-9][-\s.]?\d{3,4}[-\s.]?\d{4}/g, '[연락처 삭제]')
    .replace(/\b0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}\b/g, '[연락처 삭제]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[이메일 삭제]');
}

// ── 공간 (모듈 캐시 — 서버리스 인스턴스 단위) ────────────────
export interface DbSpace {
  id: string; sigungu: string; facility: string; name: string; category: string;
  floor: string | null; location: string | null; area_sqm: number | null;
  capacity_min: number | null; capacity_max: number | null;
  fee_per_hour: number | null; fee_per_night: number | null;
  features: string[]; specialty: string | null; reservation_lead_days: number | null;
  owner_dept: string | null; reservation_method: string | null; contact: string | null;
  booking_channel: 'self' | 'ota' | 'phone' | 'unknown';
  booking_status: 'unknown' | 'pending' | 'live' | 'closed';
  booking_links: { name: string; url: string }[];
  planned_channels: string[]; open_from: string | null;
  source: string | null; as_of: string | null; verified: boolean; trust_level: string;
  easy_summary: string | null; easy_summary_status: string;
  search_text: string | null; aliases: string[];
  embedding: number[] | null;
}

let spacesCache: { rows: DbSpace[]; at: number } | null = null;
const SPACES_TTL_MS = 60_000;

export async function getSpaces(): Promise<DbSpace[]> {
  if (spacesCache && Date.now() - spacesCache.at < SPACES_TTL_MS) return spacesCache.rows;
  const { data, error } = await supabaseAdmin().from('spaces').select('*').order('id');
  if (error) throw new Error(`spaces 조회 실패: ${error.message}`);
  const rows = (data ?? []).map((r: any) => ({
    ...r,
    // pgvector 는 문자열 "[0.1,...]" 로 내려온다
    embedding:
      typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding ?? null,
  })) as DbSpace[];
  spacesCache = { rows, at: Date.now() };
  return rows;
}

// ── 3종 로그 ────────────────────────────────────────────────
export async function appendSearchLog(row: {
  rawQuery: string;
  parsed: { purpose: string | null; headcount: number | null; region: string | null; whenText: string | null };
  outcome: 'success' | 'unmet';
  shownSpaceIds: string[];
  unmetType: string | null;
  answeredBy: 'filter' | 'fuzzy' | 'embedding' | 'llm' | null;
  llmCalled: boolean;
  latencyMs: number;
}) {
  const { error } = await supabaseAdmin().from('search_logs').insert({
    raw_query: scrub(row.rawQuery),
    purpose: row.parsed.purpose,
    headcount: row.parsed.headcount,
    region: row.parsed.region,
    when_text: row.parsed.whenText,
    outcome: row.outcome,
    shown_space_ids: row.shownSpaceIds,
    unmet_type: row.unmetType,
    answered_by: row.answeredBy,
    llm_called: row.llmCalled,
    latency_ms: row.latencyMs,
  });
  if (error) throw new Error(error.message);
}

export async function appendDemand(d: {
  rawQuery: string; unmetType: string | null; contact: string | null; note: string | null;
}) {
  const { error } = await supabaseAdmin().from('demands').insert({
    raw_query: scrub(d.rawQuery),
    unmet_type: d.unmetType,
    consented: true,
    contact: d.contact,
    note: d.note ? scrub(d.note) : null,
  });
  if (error) throw new Error(error.message);
}

export async function appendFeedback(f: {
  rawQuery: string; spaceId: string | null; reason: string; note: string | null;
}) {
  const { error } = await supabaseAdmin().from('feedbacks').insert({
    raw_query: scrub(f.rawQuery),
    space_id: f.spaceId,
    reason: f.reason,
    note: f.note ? scrub(f.note) : null,
  });
  if (error) throw new Error(error.message);
}

// ── 개관 알림 (UD-08) ───────────────────────────────────────
export async function appendNotify(spaceId: string, contact: string) {
  const { error } = await supabaseAdmin()
    .from('notify_requests')
    .insert({ space_id: spaceId, contact });
  if (error) throw new Error(error.message);
}

// ── 대관 신청 (BK) — user_id 는 Supabase Auth 검증 후 서버가 넣는다 ──
export async function insertReservation(r: {
  id: string; userId: string; spaceId: string; applicant: string;
  useDate: string; useTime: string | null; headcount: number;
  purpose: string | null; contact: string | null;
}) {
  const { error } = await supabaseAdmin().from('reservations').insert({
    id: r.id, user_id: r.userId, space_id: r.spaceId, applicant: r.applicant,
    use_date: r.useDate, use_time: r.useTime, headcount: r.headcount,
    purpose: r.purpose, contact: r.contact, status: '승인대기',
  });
  if (error) throw new Error(error.message);
}

export async function listReservations(userId: string) {
  const { data, error } = await supabaseAdmin()
    .from('reservations').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function cancelReservation(id: string, userId: string) {
  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from('reservations').select('id,status').eq('id', id).eq('user_id', userId).maybeSingle();
  if (!row) return null;
  if (row.status !== '승인대기') return { error: '승인대기 상태에서만 취소할 수 있습니다.' };
  const { data, error } = await admin
    .from('reservations').update({ status: '취소' }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { reservation: data };
}

/** Authorization: Bearer <token> → Supabase Auth 사용자. 실패 시 null */
export async function userFromToken(authHeader: string | undefined) {
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
