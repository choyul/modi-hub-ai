/**
 * E2E 자체 검증 — 배포 전 전 구간을 실제로 두드린다 (QA-02의 절차화)
 *   node scripts/e2e-check.mjs [BASE_URL]
 *
 * 검증 항목
 *   1) 4계층 검색: 어느 계층이 답했고 LLM 을 몇 번 불렀는가
 *   2) SR-11 지역 안내 · SR-05 미충족
 *   3) 채널 가드: 숙박(ota)·미확인(unknown) 신청 차단
 *   4) Supabase Auth 실계정: 생성 → 로그인 → 신청 → 조회 → 취소
 *   5) 개관 알림(UD-08) · 수요 등록(UD-02) · 피드백(UD-05)
 *   6) 담당자 집계(stats)에 위 기록이 반영되는가
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE = process.argv[2] || 'http://localhost:3000';
const results = [];
let testEmail = null;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, opts = {}) {
  const { headers, ...rest } = opts;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

// ── 1. 4계층 검색 ───────────────────────────────────────────
console.log('\n[1] 4계층 검색 (SR-10·12, 계층 배지)');
const searches = [
  { q: '부녀회 8명이서 김장할 공간 있을까요?', expectLayer: 'filter', expectHit: true },
  { q: '키친인큐베팅',                          expectLayer: null,     expectHit: true, expectNoLlm: true },   // 오타 → ② 또는 ③
  { q: '조용히 노트북 들고 일할 만한 데',        expectLayer: null,     expectHit: true },   // ③ 또는 ④
  { q: '15명이 밤새 쓸 수 있는 작업실',          expectLayer: null,     expectHit: false },  // 미충족
];
for (const s of searches) {
  const { status, body } = await api('/api/recommend-spaces', {
    method: 'POST', body: JSON.stringify({ query: s.q }),
  });
  const hit = (body?.matched?.length ?? 0) > 0;
  const layerOk = s.expectLayer ? body?.answeredBy === s.expectLayer : true;
  const noLlmOk = s.expectNoLlm ? body?.llmCalled === false : true;
  check(
    `"${s.q}"`,
    status === 200 && hit === s.expectHit && layerOk && noLlmOk,
    `계층=${body?.answeredBy} LLM호출=${body?.llmCalled} 결과=${body?.matched?.length ?? 0}건` +
      (hit ? ` [${body.matched.map((m) => m.id).join(',')}]` : ` 유형="${body?.unmetType}"`)
  );
}

// ── 2. SR-11 지역 정직 안내 ─────────────────────────────────
console.log('\n[2] 지역확장 축소안 (SR-11)');
{
  const { body } = await api('/api/recommend-spaces', {
    method: 'POST', body: JSON.stringify({ query: '영주에 20명 들어가는 회의실 있나요?' }),
  });
  check(
    '영주 질의 → 정직 안내 + 미충족 + LLM 0회',
    body?.matched?.length === 0 && Boolean(body?.regionNotice) && body?.llmCalled === false,
    `notice="${(body?.regionNotice ?? '').slice(0, 30)}…" 유형="${body?.unmetType}"`
  );
}

// ── 3. Auth 실계정 흐름 ─────────────────────────────────────
console.log('\n[3] Supabase Auth 실계정 (AU-01) + 신청 (BK)');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
testEmail = `e2e-${Date.now()}@test.modi`;
const testPw = 'e2e-test-password-1';
{
  const { error } = await admin.auth.admin.createUser({
    email: testEmail, password: testPw, email_confirm: true,
  });
  check('테스트 계정 생성 (admin API)', !error, error?.message ?? testEmail);
}
const anon = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
  email: testEmail, password: testPw,
});
check('로그인 → 세션 토큰', !signInErr && Boolean(signIn?.session), signInErr?.message ?? '');
const token = signIn?.session?.access_token;
const authH = { Authorization: `Bearer ${token}` };

{
  const { status } = await api('/api/reservation', { method: 'GET' });
  check('토큰 없이 신청 조회 → 401', status === 401);
}
{
  const { status, body } = await api('/api/reservation', {
    method: 'POST', headers: authH,
    body: JSON.stringify({ spaceId: 'NB02', useDate: '2026-12-24', headcount: 2 }),
  });
  check('숙박(ota) 신청 차단 → 409 (BK-08 채널 가드)', status === 409, body?.error?.slice(0, 50));
}
{
  const { status, body } = await api('/api/reservation', {
    method: 'POST', headers: authH,
    body: JSON.stringify({ spaceId: 'AG01', useDate: '2026-12-24', headcount: 4 }),
  });
  check('미확인(unknown) 신청 차단 → 409 (BK-04)', status === 409, body?.error?.slice(0, 40));
}
{
  const { status, body } = await api('/api/reservation', {
    method: 'POST', headers: authH,
    body: JSON.stringify({ spaceId: 'GR01', useDate: '2026-11-28', headcount: 40 }),
  });
  check('수용인원 초과 차단 → 400 (BK-03)', status === 400, body?.error);
}
let revId = null;
{
  const { status, body } = await api('/api/reservation', {
    method: 'POST', headers: authH,
    body: JSON.stringify({
      spaceId: 'GR01', useDate: '2026-11-28', useTime: '10:00~14:00',
      headcount: 8, purpose: '부녀회 김장',
    }),
  });
  revId = body?.reservation?.id;
  check('정상 신청 접수 → 승인대기 (BK-01)', status === 200 && body?.reservation?.status === '승인대기', revId);
}
{
  const { status, body } = await api('/api/reservation', { method: 'GET', headers: authH });
  check('본인 신청 조회 (BK-06)', status === 200 && body?.reservations?.some((r) => r.id === revId),
    `${body?.reservations?.length}건`);
}
{
  const { status, body } = await api('/api/reservation', {
    method: 'DELETE', headers: authH, body: JSON.stringify({ id: revId }),
  });
  check('본인 신청 취소 (BK-05)', status === 200 && body?.reservation?.status === '취소');
}

// ── 4. 개관 알림 · 수요 등록 · 피드백 ────────────────────────
console.log('\n[4] 수집 3종 (UD-08·02·05)');
{
  const { status } = await api('/api/notify', {
    method: 'POST', body: JSON.stringify({ spaceId: 'NB02', contact: 'e2e@test.modi' }),
  });
  check('개관 알림 신청 (pending 공간) → 200', status === 200);
}
{
  const { status } = await api('/api/notify', {
    method: 'POST', body: JSON.stringify({ spaceId: 'GR01', contact: 'e2e@test.modi' }),
  });
  check('개관 알림 — live 공간 거절 → 409', status === 409);
}
{
  const { status } = await api('/api/demand', {
    method: 'POST',
    body: JSON.stringify({ rawQuery: '15명 밤샘 작업실 (e2e)', unmetType: '야간 작업공간' }),
  });
  check('동의 기반 수요 등록 → 200', status === 200);
}
{
  const { status } = await api('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({ rawQuery: 'e2e 피드백', spaceId: 'GR01', reason: 'far' }),
  });
  check('이탈 피드백 → 200', status === 200);
}

// ── 5. 담당자 집계 반영 ─────────────────────────────────────
console.log('\n[5] 담당자 집계 (stats)');
{
  const { body } = await api('/api/stats', { headers: { 'x-admin-token': process.env.ADMIN_TOKEN } });
  const s = body?.summary;
  check('검색이 집계에 반영', (s?.totalSearches ?? 0) >= 5, `누적 ${s?.totalSearches}건, 미충족 ${s?.unmetCount}건`);
  check('무LLM 응답 비율 산출 (시연 ⓒ 원자료)', typeof s?.noLlmRate === 'number', `${s?.noLlmRate}% (LLM 미사용 ${s?.noLlmCount}건)`);
  check('개관 대기자 집계 (AD-14)', (s?.notifyWaiters ?? 0) >= 1, `${s?.notifyWaiters}명 대기`);
  check('원문 열람 (토큰 인증)', body?.detailAuthorized === true &&
    body?.recent?.[0]?.rawQuery !== '[비공개]');
}

// ── 정리: 테스트 계정 삭제 ──────────────────────────────────
{
  const { data } = await admin.auth.admin.listUsers();
  const u = data?.users?.find((x) => x.email === testEmail);
  if (u) await admin.auth.admin.deleteUser(u.id);
  console.log(`\n(테스트 계정 ${testEmail} 삭제 완료)`);
}

const fail = results.filter((r) => !r.ok).length;
console.log(`\n━━━ ${results.length}개 중 ${results.length - fail}개 통과${fail ? `, ${fail}개 실패` : ''} ━━━`);
process.exit(fail ? 1 : 0);
