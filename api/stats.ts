/**
 * GET /api/stats — 담당자 화면 단일 데이터원. Supabase 에서 그 자리에서 집계한다.
 * 원문 질의·연락처는 x-admin-token 이 맞을 때만 내려간다 (LG-06).
 */
import { supabaseAdmin } from '../server/supabase.js';
import { getSpaces, isPersistent } from '../server/db.js';

const REASON_LABEL: Record<string, string> = {
  far: '너무 멀어요', time: '시간이 안 맞아요', cost: '비용이 부담돼요',
  type: '원하는 유형이 아니에요', other: '기타·정보오류',
};
const LAYER_LABEL: Record<string, string> = {
  filter: '① 조건필터', fuzzy: '② 퍼지', embedding: '③ 임베딩', llm: '④ LLM',
};

function countBy<T>(items: T[], key: (t: T) => string | null) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET만 허용됩니다.' });
  }

  try {
    const sb = supabaseAdmin();
    const [logsQ, demandsQ, feedbacksQ, reservationsQ, notifyQ, spaces] = await Promise.all([
      sb.from('search_logs').select('*').order('ts', { ascending: false }).limit(500),
      sb.from('demands').select('*').order('ts', { ascending: false }).limit(200),
      sb.from('feedbacks').select('*').order('ts', { ascending: false }).limit(200),
      sb.from('reservations').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('notify_requests').select('*').order('ts', { ascending: false }).limit(200),
      getSpaces(),
    ]);
    for (const q of [logsQ, demandsQ, feedbacksQ, reservationsQ, notifyQ]) {
      if (q.error) throw new Error(q.error.message);
    }
    const logs = logsQ.data ?? [];
    const demands = demandsQ.data ?? [];
    const feedbacks = feedbacksQ.data ?? [];
    const reservations = reservationsQ.data ?? [];
    const notifies = notifyQ.data ?? [];
    const spaceName = (id: string | null) =>
      spaces.find((s) => s.id === id)?.name ?? id ?? '?';

    const unmetLogs = logs.filter((l) => l.outcome === 'unmet');
    const noLlm = logs.filter((l) => !l.llm_called);
    const adminToken = process.env.ADMIN_TOKEN;
    const authorized = Boolean(adminToken) && req.headers['x-admin-token'] === adminToken;

    const recent = logs.slice(0, 50).map((l) => ({
      ts: l.ts,
      rawQuery: authorized ? l.raw_query : '[비공개]',
      parsed: { purpose: l.purpose, headcount: l.headcount, region: l.region, whenText: l.when_text },
      outcome: l.outcome,
      shownSpaceIds: l.shown_space_ids ?? [],
      unmetType: l.unmet_type,
      latencyMs: l.latency_ms ?? 0,
      answeredBy: l.answered_by,
    }));

    return res.status(200).json({
      persisted: isPersistent,
      detailAuthorized: authorized,
      tokenConfigured: Boolean(adminToken),
      detailNotice: adminToken ? null : 'ADMIN_TOKEN이 설정되지 않아 원문 질의 목록은 내려보내지 않습니다.',
      summary: {
        totalSearches: logs.length,
        successCount: logs.length - unmetLogs.length,
        unmetCount: unmetLogs.length,
        unmetRate: logs.length ? Math.round((unmetLogs.length / logs.length) * 100) : 0,
        registeredDemands: demands.length,
        contactLeft: demands.filter((d) => d.contact).length,
        reservationCount: reservations.length,
        pendingReservations: reservations.filter((r) => r.status === '승인대기').length,
        cancelledReservations: reservations.filter((r) => r.status === '취소').length,
        feedbackCount: feedbacks.length,
        avgLatencyMs: logs.length
          ? Math.round(logs.reduce((a, l) => a + (l.latency_ms || 0), 0) / logs.length)
          : 0,
        // SR-10 축퇴의 실측 — "LLM 없이 몇 %를 응답했는가" (시연 ⓒ의 원자료)
        noLlmCount: noLlm.length,
        noLlmRate: logs.length ? Math.round((noLlm.length / logs.length) * 100) : 0,
        notifyWaiters: notifies.filter((n) => !n.notified_at).length,
      },
      unmetTypes: countBy(unmetLogs, (l) => l.unmet_type),
      regions: countBy(logs, (l) => l.region),
      feedbackReasons: countBy(feedbacks, (f) => REASON_LABEL[f.reason] ?? f.reason),
      topShownSpaces: countBy(
        logs.flatMap((l) => (l.shown_space_ids ?? []).map((id: string) => ({ id }))),
        (s: any) => s.id
      ),
      answeredBy: countBy(logs, (l) => LAYER_LABEL[l.answered_by] ?? null),
      recent,
      demands: authorized
        ? demands.slice(0, 50).map((d) => ({
            ts: d.ts, rawQuery: d.raw_query, unmetType: d.unmet_type, contact: d.contact,
          }))
        : [],
      feedback: authorized
        ? feedbacks.slice(0, 50).map((f) => ({
            ts: f.ts, rawQuery: f.raw_query, spaceId: f.space_id, reason: f.reason, note: f.note,
          }))
        : [],
      reservations: authorized
        ? reservations.slice(0, 50).map((r) => ({
            id: r.id, ts: r.created_at, spaceId: r.space_id, applicant: r.applicant,
            useDate: r.use_date, headcount: r.headcount, purpose: r.purpose ?? '기재 없음',
            status: r.status,
          }))
        : [],
      // AD-14: 개관 대기자 — 공간별 집계는 공개, 연락처는 토큰 보유자만
      notifyWaitersBySpace: countBy(
        notifies.filter((n) => !n.notified_at),
        (n) => spaceName(n.space_id)
      ),
      notifyRequests: authorized
        ? notifies.slice(0, 50).map((n) => ({
            ts: n.ts, spaceName: spaceName(n.space_id), contact: n.contact,
            notified: Boolean(n.notified_at),
          }))
        : [],
    });
  } catch (err) {
    console.error('집계 실패:', err);
    return res.status(500).json({ error: '집계를 불러오지 못했습니다.' });
  }
}
