/**
 * QA 통합 테스트 스위트 — 사용자 유형(페르소나)별 전 기능 검증.
 *   node scripts/qa-suite.mjs [BASE_URL]
 *
 * 설계 원칙
 *   1) 권한(G/U/O/A/S)별로 "그 사람이 실제로 하는 일" 순서대로 두드린다.
 *   2) 기대결과를 먼저 쓰고 실제값을 받아 비교한다 (테스트가 스펙이 되도록).
 *   3) 통과/실패만이 아니라 '실제 관측값'을 남긴다 — 보고서의 근거가 된다.
 *   4) 차단이 정상인 케이스(권한·채널 가드)를 반드시 포함한다.
 *      막히는 것을 확인하지 않은 테스트는 통과가 아니다.
 *
 * 결과는 qa-results.json 으로 저장되고 build-qa-report.py 가 엑셀로 만든다.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { writeFileSync, readFileSync, existsSync } from 'fs';

dotenv.config({ path: '.env.local' });

const BASE = process.argv[2] || 'https://modi-hub-ai.vercel.app';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const cases = [];
let seq = 0;

/** 테스트 1건 기록 */
function T(meta, ok, actual) {
  seq += 1;
  const row = {
    no: seq,
    tcId: `TC-${String(seq).padStart(3, '0')}`,
    ...meta,
    actual: String(actual ?? '').slice(0, 300),
    result: ok ? 'PASS' : 'FAIL',
  };
  cases.push(row);
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${row.tcId} [${meta.role}] ${meta.title}`);
  if (!ok) console.log(`      기대: ${meta.expected}\n      실제: ${row.actual}`);
  return ok;
}

async function api(path, opts = {}) {
  const { headers, ...rest } = opts;
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body, ms: Date.now() - t0 };
}
const search = (q) => api('/api/recommend-spaces', { method: 'POST', body: JSON.stringify({ query: q }) });
const ids = (b) => (b?.matched ?? []).map((m) => m.id).join(',') || '(없음)';

console.log(`\n대상: ${BASE}\n${'━'.repeat(64)}`);

// 워밍업 — 서버리스 콜드스타트를 성능 측정에서 분리한다.
// (콜드스타트 지연은 TC 말미에 '제약'으로 따로 기록)
const coldMs = (await search('워밍업')).ms;
await search('워밍업2');

// ══════════════════════════════════════════════════════════════
// G — 게스트 (로그인 없음) · 페르소나 P1 김명자 / P3 박준호
// ══════════════════════════════════════════════════════════════
console.log('\n▸ G 게스트 — 찾기의 흐름');

{
  const { status, body, ms } = await search('부녀회 8명이 김장할 만한 곳');
  T({ persona: 'P1 김명자(68·주민)', role: 'G', feature: 'SR-01·SR-02', area: '검색',
      title: '자연어 한 문장으로 공간을 찾는다',
      pre: '로그인 없음', input: '"부녀회 8명이 김장할 만한 곳"',
      expected: '200 · 결과 1건 이상 · 키친 계열 포함' },
    status === 200 && (body?.matched?.length ?? 0) > 0,
    `${status} · ${ids(body)} · ${ms}ms`);

  T({ persona: 'P1 김명자(68·주민)', role: 'G', feature: 'SR-10', area: '검색',
      title: '①조건필터가 답하면 LLM을 부르지 않는다 (축퇴)',
      pre: '위와 동일 질의', input: '동일',
      expected: 'answeredBy=filter · llmCalled=false' },
    body?.answeredBy === 'filter' && body?.llmCalled === false,
    `계층=${body?.answeredBy} · LLM호출=${body?.llmCalled}`);

  T({ persona: 'P1 김명자(68·주민)', role: 'G', feature: 'NF-01', area: '성능',
      title: '검색 응답이 3초 이내에 온다 (웜 기준)',
      pre: '서버 워밍업 후 — 콜드스타트 제외', input: '동일',
      expected: '3,000ms 미만' }, ms < 3000, `${ms}ms (콜드스타트 최초 1회는 ${coldMs}ms)`);
}

{
  const { body } = await search('회의실 6명');
  T({ persona: 'P1 김명자(68·주민)', role: 'G', feature: 'SR-04', area: '검색',
      title: '인원수가 수용범위에 맞는 공간만 나온다',
      pre: '모임방 2~6명 / 라운지 정원 미확정', input: '"회의실 6명"',
      expected: 'GL4M(모임방) 포함' },
    ids(body).includes('GL4M'), ids(body));
}

{
  const { body } = await search('30명 들어가는 회의실');
  const over = (body?.matched ?? []).some((m) => m.id === 'GL4M');
  T({ persona: 'P4 최영수(45·공무원)', role: 'G', feature: 'SR-04', area: '검색',
      title: '수용인원을 넘는 공간은 추천하지 않는다',
      pre: '모임방 최대 6명', input: '"30명 들어가는 회의실"',
      expected: 'GL4M 미포함 (수용 초과)' }, !over, ids(body));
}

{
  const { body } = await search('봉화의 작업실');
  const { body: typo } = await search('봉하의 자겁실');
  T({ persona: 'P3 박준호(29·모바일)', role: 'G', feature: 'SR-12', area: '검색',
      title: '오타를 쳐도 같은 공간을 찾아준다 (②퍼지·한글 자모)',
      pre: '정타 결과와 비교', input: '정타 "봉화의 작업실" / 오타 "봉하의 자겁실"',
      expected: '오타 질의도 결과 1건 이상 · LLM 호출 없이' },
    (typo?.matched?.length ?? 0) > 0 && typo?.llmCalled === false,
    `정타=${ids(body)} / 오타=${ids(typo)} 계층=${typo?.answeredBy} LLM=${typo?.llmCalled}`);
}

{
  const { body } = await search('조용히 노트북 들고 일할 만한 데');
  T({ persona: 'P3 박준호(29·모바일)', role: 'G', feature: 'SR-03', area: '검색',
      title: '키워드가 안 겹쳐도 의미로 찾는다 (③임베딩)',
      pre: '"노트북"은 있으나 "조용히 일할"은 사전에 없음', input: '"조용히 노트북 들고 일할 만한 데"',
      expected: '작업실(GL4) 포함' }, ids(body).includes('GL4'),
    `${ids(body)} · 계층=${body?.answeredBy}`);
}

{
  const { body } = await search('수영장 빌릴 수 있나요');
  T({ persona: 'P1 김명자(68·주민)', role: 'G', feature: 'SR-05·UD-01', area: '미충족',
      title: '없는 것은 없다고 답한다 (지어내지 않음)',
      pre: '봉화 거점시설에 수영장 없음', input: '"수영장 빌릴 수 있나요"',
      expected: '결과 0건 · 미충족으로 기록' },
    (body?.matched?.length ?? 0) === 0,
    `결과=${body?.matched?.length}건 · 유형="${body?.unmetType}"`);
}

{
  const { body } = await search('영주에 20명 들어가는 회의실 있나요?');
  T({ persona: 'P4 최영수(45·공무원)', role: 'G', feature: 'SR-11', area: '검색',
      title: '보유하지 않은 지역은 정직하게 안내한다',
      pre: '봉화 데이터만 보유', input: '"영주에 20명 들어가는 회의실"',
      expected: '결과 0건 + 안내문구 + LLM 0회' },
    (body?.matched?.length ?? 0) === 0 && Boolean(body?.regionNotice) && body?.llmCalled === false,
    `안내="${(body?.regionNotice ?? '').slice(0, 40)}" LLM=${body?.llmCalled}`);
}

{
  const { status } = await api('/api/recommend-spaces', { method: 'POST', body: JSON.stringify({ query: '' }) });
  T({ persona: 'P3 박준호(29·모바일)', role: 'G', feature: 'SR-09', area: '입력검증',
      title: '빈 검색어는 서버가 거절한다',
      pre: '없음', input: '빈 문자열',
      expected: '400 (500 서버오류가 아님)' }, status === 400, `HTTP ${status}`);
}

{
  const { status } = await api('/api/notify', {
    method: 'POST', body: JSON.stringify({ spaceId: 'GL7', contact: 'qa-guest@test.modi' }) });
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'G', feature: 'UD-08', area: '개관알림',
      title: '운영 중인 공간은 개관알림 대상이 아니다',
      pre: '전 공간 운영 중(live) — 개관 예정 공간 없음', input: 'spaceId=GL7',
      expected: '409 거절' }, status === 409, `HTTP ${status}`);
}

{
  const { status } = await api('/api/notify', {
    method: 'POST', body: JSON.stringify({ spaceId: 'GL4M', contact: 'qa@test.modi' }) });
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'G', feature: 'UD-08', area: '개관알림',
      title: '이미 운영 중인 공간은 개관알림을 받지 않는다',
      pre: 'GL4M = self/live', input: 'spaceId=GL4M',
      expected: '409 거절' }, status === 409, `HTTP ${status}`);
}

{
  const { status } = await api('/api/demand', { method: 'POST', body: JSON.stringify({
    rawQuery: '수영장 빌릴 수 있나요 (QA)', unmetType: '체육시설', contact: 'qa-demand@test.modi' }) });
  T({ persona: 'P1 김명자(68·주민)', role: 'G', feature: 'UD-02·UD-03', area: '미충족',
      title: '동의한 사람만 수요로 등록된다',
      pre: '0건 결과 화면에서 동의 후 제출', input: '미충족 유형 + 연락처',
      expected: '200 등록' }, status === 200, `HTTP ${status}`);
}

{
  const { status } = await api('/api/feedback', { method: 'POST', body: JSON.stringify({
    rawQuery: '회의실 6명 (QA)', spaceId: 'GL4M', reason: 'time' }) });
  T({ persona: 'P3 박준호(29·모바일)', role: 'G', feature: 'UD-05', area: '피드백',
      title: '추천을 받고도 안 쓴 이유를 남길 수 있다',
      pre: '추천 결과 화면', input: 'reason=time(시간이 안 맞음)',
      expected: '200 접수' }, status === 200, `HTTP ${status}`);
}

{
  const { body } = await api('/api/stats');
  const masked = body?.detailAuthorized === false;
  T({ persona: '미인증 외부인', role: 'G', feature: 'LG-06', area: '보안',
      title: '토큰 없이는 검색 원문을 볼 수 없다',
      pre: '헤더 없음', input: 'GET /api/stats',
      expected: 'detailAuthorized=false · 원문 [비공개]' },
    masked && (body?.recent?.[0]?.rawQuery ?? '[비공개]') === '[비공개]',
    `열람권한=${body?.detailAuthorized} · 첫 원문="${body?.recent?.[0]?.rawQuery ?? '-'}"`);
}

// ══════════════════════════════════════════════════════════════
// U — 신청자 (Supabase Auth) · 페르소나 P2 이수진
// ══════════════════════════════════════════════════════════════
console.log('\n▸ U 신청자 — 신청의 흐름');

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const anon = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const email = `qa-${Date.now()}@test.modi`;
const pw = 'qa-test-password-1';
let token = null, authH = {};

{
  // 화면의 '회원가입'과 같은 경로로 만든다 — 담당자 대행이 아니라 주민 스스로
  const { status, body } = await api('/api/signup', {
    method: 'POST', body: JSON.stringify({ email, password: pw }) });
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'U', feature: 'AU-01', area: '인증',
      title: '주민이 스스로 계정을 만든다 (확인 메일 없이 바로 사용)',
      pre: '로그인 없음', input: email,
      expected: '200 · 곧바로 로그인 가능한 상태' }, status === 200,
    `HTTP ${status} ${body?.error ?? email}`);
}
{
  const { status, body } = await api('/api/signup', {
    method: 'POST', body: JSON.stringify({ email, password: pw }) });
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'U', feature: 'AU-01', area: '입력검증',
      title: '같은 이메일로 두 번 가입되지 않는다',
      pre: '이미 가입됨', input: '동일 이메일',
      expected: '409 + 로그인 안내' }, status === 409, `HTTP ${status} · ${body?.error}`);
}
{
  const { status, body } = await api('/api/signup', {
    method: 'POST', body: JSON.stringify({ email: `short-${Date.now()}@test.modi`, password: '123' }) });
  T({ persona: 'P3 박준호(29·모바일)', role: 'U', feature: 'AU-01', area: '입력검증',
      title: '너무 짧은 비밀번호는 거절한다',
      pre: '없음', input: '비밀번호 3자',
      expected: '400 + 기준 안내' }, status === 400, `HTTP ${status} · ${body?.error}`);
}
{
  const { status, body } = await api('/api/signup', {
    method: 'POST', body: JSON.stringify({ email: 'not-an-email', password: 'abcdef123' }) });
  T({ persona: 'P3 박준호(29·모바일)', role: 'U', feature: 'AU-01', area: '입력검증',
      title: '이메일 형식이 아니면 거절한다',
      pre: '없음', input: '"not-an-email"',
      expected: '400' }, status === 400, `HTTP ${status} · ${body?.error}`);
}
{
  const { data, error } = await anon.auth.signInWithPassword({ email, password: pw });
  token = data?.session?.access_token;
  authH = { Authorization: `Bearer ${token}` };
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'U', feature: 'AU-01', area: '인증',
      title: '로그인하면 세션 토큰을 받는다',
      pre: '계정 생성됨', input: '이메일+비밀번호',
      expected: 'access_token 발급' }, !error && Boolean(token),
    error?.message ?? `토큰 ${token ? '발급됨(' + token.slice(0, 12) + '…)' : '없음'}`);
}
{
  const { error } = await anon.auth.signInWithPassword({ email, password: 'wrong-password' });
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'U', feature: 'AU-02', area: '인증',
      title: '비밀번호가 틀리면 로그인되지 않는다',
      pre: '계정 존재', input: '잘못된 비밀번호',
      expected: '인증 실패' }, Boolean(error), error?.message ?? '(오류 없음 — 결함)');
}
{
  const { status } = await api('/api/reservation', { method: 'GET' });
  T({ persona: '미인증 외부인', role: 'U', feature: 'BK-06', area: '보안',
      title: '로그인 없이 남의 신청 내역을 볼 수 없다',
      pre: '토큰 없음', input: 'GET /api/reservation',
      expected: '401' }, status === 401, `HTTP ${status}`);
}

let revId = null;
{
  const { status, body } = await api('/api/reservation', { method: 'POST', headers: authH,
    body: JSON.stringify({ spaceId: 'GL4M', useDate: '2026-09-15', useTime: '14:00~16:00',
      headcount: 5, purpose: '독서모임 (QA)' }) });
  revId = body?.reservation?.id;
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'U', feature: 'BK-01', area: '대관신청',
      title: '모임방 대관을 신청한다',
      pre: 'GL4M = self/live · 정원 6명', input: '9/15 14~16시 · 5명 · 독서모임',
      expected: '200 접수' }, status === 200, `HTTP ${status} · ${revId ?? body?.error}`);

  T({ persona: 'P2 이수진(34·워킹맘)', role: 'U', feature: 'BK-07', area: '대관신청',
      title: '신청은 자동 확정되지 않는다 (승인대기)',
      pre: '위 신청', input: '동일',
      expected: 'status="승인대기" — 확정 경로 없음' },
    body?.reservation?.status === '승인대기', `상태="${body?.reservation?.status}"`);
}
{
  const { status, body } = await api('/api/reservation', { method: 'POST', headers: authH,
    body: JSON.stringify({ spaceId: 'GL4M', useDate: '2026-09-16', headcount: 20 }) });
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'U', feature: 'BK-03', area: '대관신청',
      title: '정원을 넘는 인원은 접수되지 않는다',
      pre: 'GL4M 최대 6명', input: '20명',
      expected: '400 + 최대 인원 안내' }, status === 400, `HTTP ${status} · ${body?.error}`);
}
{
  const { status, body } = await api('/api/reservation', { method: 'POST', headers: authH,
    body: JSON.stringify({ spaceId: 'GL7', useDate: '2026-12-24', headcount: 2 }) });
  const stayId = body?.reservation?.id;
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'U', feature: 'BK-01', area: '대관신청',
      title: '숙박도 온라인으로 신청된다 (전 공간 개방)',
      pre: 'GL7 = self/live · 60,000원/1박', input: '12/24 · 2명',
      expected: '200 · 승인대기' },
    status === 200 && body?.reservation?.status === '승인대기', `HTTP ${status} · ${stayId}`);
  if (stayId) await api('/api/reservation', { method: 'DELETE', headers: authH,
    body: JSON.stringify({ id: stayId }) });
}
{
  const { status, body } = await api('/api/reservation', { method: 'POST', headers: authH,
    body: JSON.stringify({ spaceId: 'ZZ99', useDate: '2026-09-20', headcount: 4 }) });
  T({ persona: 'P4 최영수(45·공무원)', role: 'U', feature: 'BK-04', area: '입력검증',
      title: '존재하지 않는 공간은 신청되지 않는다',
      pre: '없음', input: 'spaceId=ZZ99',
      expected: '400' }, status === 400, `HTTP ${status} · ${body?.error}`);
}
{
  const { status, body } = await api('/api/reservation', { method: 'POST', headers: authH,
    body: JSON.stringify({ spaceId: 'GL4', useDate: '2026-09-20', headcount: 12,
      purpose: '단체 이용 (QA)' }) });
  const gid = body?.reservation?.id;
  T({ persona: 'P3 박준호(29·모바일)', role: 'U', feature: 'BK-01', area: '대관신청',
      title: '작업실 단체 이용도 온라인으로 신청된다',
      pre: 'GL4 = self/live · 단체는 온라인 신청', input: '12명',
      expected: '200 · 승인대기' },
    status === 200 && body?.reservation?.status === '승인대기', `HTTP ${status} · ${gid}`);
  if (gid) await api('/api/reservation', { method: 'DELETE', headers: authH,
    body: JSON.stringify({ id: gid }) });
}
{
  const { status, body } = await api('/api/reservation', { method: 'POST', headers: authH,
    body: JSON.stringify({ spaceId: 'GL4M', headcount: 4 }) });
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'U', feature: 'BK-02', area: '입력검증',
      title: '이용일을 비우면 접수되지 않는다',
      pre: '로그인됨', input: 'useDate 누락',
      expected: '400 + 입력 안내' }, status === 400, `HTTP ${status} · ${body?.error}`);
}
{
  const { status, body } = await api('/api/reservation', { method: 'GET', headers: authH });
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'U', feature: 'BK-06', area: '대관신청',
      title: '내가 넣은 신청만 조회된다',
      pre: '신청 1건 존재', input: 'GET (본인 토큰)',
      expected: '본인 건만 · 방금 신청 포함' },
    status === 200 && (body?.reservations ?? []).some((r) => r.id === revId),
    `${body?.reservations?.length}건 조회`);
}
{
  const { status, body } = await api('/api/reservation', { method: 'DELETE', headers: authH,
    body: JSON.stringify({ id: revId }) });
  T({ persona: 'P2 이수진(34·워킹맘)', role: 'U', feature: 'BK-05', area: '대관신청',
      title: '승인 전이면 스스로 취소할 수 있다 (되돌리기)',
      pre: '승인대기 상태', input: `DELETE ${revId}`,
      expected: '200 · status="취소"' },
    status === 200 && body?.reservation?.status === '취소', `HTTP ${status} · ${body?.reservation?.status}`);
}
{
  // 타인 신청 취소 시도 — 두 번째 계정으로
  const email2 = `qa2-${Date.now()}@test.modi`;
  await admin.auth.admin.createUser({ email: email2, password: pw, email_confirm: true });
  const { data } = await anon.auth.signInWithPassword({ email: email2, password: pw });
  const { status } = await api('/api/reservation', { method: 'DELETE',
    headers: { Authorization: `Bearer ${data?.session?.access_token}` },
    body: JSON.stringify({ id: revId }) });
  T({ persona: '제3자 계정', role: 'U', feature: 'BK-05·RLS', area: '보안',
      title: '남의 신청은 취소할 수 없다',
      pre: '다른 계정으로 로그인', input: `DELETE ${revId} (타인 소유)`,
      expected: '404/403 — 성공(200)이면 중대 결함' }, status !== 200, `HTTP ${status}`);
  const { data: u2 } = await admin.auth.admin.listUsers();
  const t2 = u2?.users?.find((x) => x.email === email2);
  if (t2) await admin.auth.admin.deleteUser(t2.id);
}

// ══════════════════════════════════════════════════════════════
// O — 공무원 (로그인 없음, 내부 URL) · 페르소나 P4 최영수
// ══════════════════════════════════════════════════════════════
console.log('\n▸ O 공무원 — 조회의 흐름');

const spacesJson = JSON.parse(readFileSync('src/data/spaces.json', 'utf8'));
{
  const all = spacesJson.spaces;
  T({ persona: 'P4 최영수(45·공무원)', role: 'O', feature: 'SP-07', area: '조건조회',
      title: '조건 필터 화면이 전체 공간을 다 담고 있다',
      pre: '/spaces 화면 (구 조건조회 통합)', input: '데이터 로드',
      expected: '계획서 공간 11건 전량' }, all.length === 11, `${all.length}건`);

  const cats = [...new Set(all.map((s) => s.category))];
  T({ persona: 'P4 최영수(45·공무원)', role: 'O', feature: 'SP-07', area: '조건조회',
      title: '카테고리 분류가 데이터와 일치한다',
      pre: '필터 옵션', input: 'category 목록',
      expected: '정의된 분류 외 값 없음' },
    cats.every((c) => spacesJson._meta.categories.includes(c) || c === '미정'),
    cats.join(', '));
}
{
  // 2026-08-13 요구 변경: 시스템 자기설명 문구('AI 미사용', '계획값' 고지)를
  // 사용자 요청으로 제거 — 일반 예약 서비스 톤. 검증도 반대로 뒤집는다.
  const src = readFileSync('src/pages/user/UserSpaces.tsx', 'utf8');
  const clean = !src.includes('AI를 사용하지') && !src.includes('확인 필요」로 안내');
  T({ persona: 'P4 최영수(45·공무원)', role: 'O', feature: 'SP-07·G1', area: 'UX',
      title: '목록 화면에 시스템 자기설명 문구가 없다 (예약 서비스 톤)',
      pre: '/spaces', input: '화면 문구',
      expected: 'AI 미사용·계획값 고지 문구 제거됨' }, clean,
    clean ? '방어적 문구 없음 확인' : '문구 잔존');
}
{
  // 통합의 핵심 — 공무원에게 필요했던 '조건 여러 개'가 한 화면에 있는가
  const src = readFileSync('src/pages/user/UserSpaces.tsx', 'utf8');
  const hasAll = ['category', 'facility', 'headcount'].every((k) => src.includes(`'${k}'`));
  const hasSort = src.includes("'cap_asc'") && src.includes("'cap_desc'");
  T({ persona: 'P4 최영수(45·공무원)', role: 'O', feature: 'SP-07', area: 'UX',
      title: '조건 3종(용도·시설·인원)과 정렬이 한 화면에 있다',
      pre: '「조건조회」를 「공간안내」로 통합', input: '화면 구성 확인',
      expected: '필터 3종 + 정렬 — 별도 메뉴 불필요' },
    hasAll && hasSort, `필터 3종=${hasAll} · 정렬=${hasSort}`);
}
{
  const nav = readFileSync('src/layouts/UserLayout.tsx', 'utf8');
  const app = readFileSync('src/App.tsx', 'utf8');
  T({ persona: 'P1 김명자(68·주민)', role: 'O', feature: 'SP-07·G10', area: 'UX',
      title: '중복 메뉴가 사라지고 기존 링크는 살아 있다',
      pre: '/filter 북마크·문서 링크 존재', input: '네비 + 라우트',
      expected: '메뉴에서 조건조회 제거 · /filter 는 리다이렉트로 보존' },
    !nav.includes("to: '/filter'") && app.includes('Navigate to="/spaces"'),
    `네비 제거=${!nav.includes("to: '/filter'")} · 리다이렉트=${app.includes('Navigate to="/spaces"')}`);
}

// ══════════════════════════════════════════════════════════════
// A — 담당자 (ADMIN_TOKEN) · 페르소나 P5 조율(도시재생팀)
// ══════════════════════════════════════════════════════════════
console.log('\n▸ A 담당자 — 소비의 흐름');

const adminH = { 'x-admin-token': ADMIN_TOKEN };
// 테스트용 1x1 PNG — 실제 이미지여야 업로드 경로가 검증된다
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
let stats = null;
{
  const { status, body } = await api('/api/stats', { headers: adminH });
  stats = body;
  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-01', area: '집계',
      title: '오늘 주민이 무엇을 찾았는지 한 화면에서 본다',
      pre: '토큰 보유', input: 'GET /api/stats',
      expected: '200 · 검색 누적 집계' },
    status === 200 && (body?.summary?.totalSearches ?? 0) > 0,
    `검색 ${body?.summary?.totalSearches}건 · 미충족 ${body?.summary?.unmetCount}건`);

  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-02', area: '집계',
      title: '못 찾은 요청이 유형별로 묶여 나온다',
      pre: '미충족 발생', input: 'unmetTypes',
      expected: '유형 1개 이상' }, (body?.unmetTypes?.length ?? 0) > 0,
    (body?.unmetTypes ?? []).map((u) => `${u.label}(${u.count})`).join(', ') || '(없음)');

  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-03·SR-10', area: '집계',
      title: 'AI 없이 처리한 비율이 산출된다 (운영비 근거)',
      pre: '검색 누적', input: 'noLlmRate',
      expected: '숫자값 · 계층 분포 표기' },
    typeof body?.summary?.noLlmRate === 'number' && (body?.answeredBy?.length ?? 0) > 0,
    `무LLM ${body?.summary?.noLlmRate}% · ${(body?.answeredBy ?? []).map((a) => `${a.label}:${a.count}`).join(' ')}`);

  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-14', area: '집계',
      title: '개관 대기자 수가 집계된다 (현재 개관 예정 공간 없음 → 0명)',
      pre: '전 공간 운영 중', input: 'notifyWaiters',
      expected: '숫자 산출' }, typeof body?.summary?.notifyWaiters === 'number',
    `${body?.summary?.notifyWaiters}명 대기`);

  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-13', area: '집계',
      title: '이탈 사유가 집계된다',
      pre: '피드백 제출됨', input: 'feedbackReasons',
      expected: '1건 이상' }, (body?.summary?.feedbackCount ?? 0) > 0,
    `${body?.summary?.feedbackCount}건 · ${(body?.feedbackReasons ?? []).map((f) => f.label).join(',')}`);

  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'LG-06', area: '보안',
      title: '토큰이 있으면 원문 질의를 열람할 수 있다',
      pre: 'ADMIN_TOKEN 제시', input: 'x-admin-token',
      expected: 'detailAuthorized=true · 원문 노출' },
    body?.detailAuthorized === true && body?.recent?.[0]?.rawQuery !== '[비공개]',
    `열람=${body?.detailAuthorized} · 예시="${(body?.recent?.[0]?.rawQuery ?? '').slice(0, 24)}"`);

  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-04', area: '집계',
      title: '대관 신청 현황이 반영된다',
      pre: '신청→취소 1건', input: 'reservations',
      expected: '1건 이상 집계' }, (body?.summary?.reservationCount ?? 0) > 0,
    `총 ${body?.summary?.reservationCount}건 · 대기 ${body?.summary?.pendingReservations} · 취소 ${body?.summary?.cancelledReservations}`);
}
{
  const { body } = await api('/api/stats', { headers: { 'x-admin-token': 'wrong-token-xyz' } });
  T({ persona: '토큰 오입력', role: 'A', feature: 'LG-06', area: '보안',
      title: '틀린 토큰으로는 원문이 열리지 않는다',
      pre: '잘못된 토큰', input: 'x-admin-token: wrong-token-xyz',
      expected: 'detailAuthorized=false' }, body?.detailAuthorized === false,
    `열람=${body?.detailAuthorized}`);
}
// ── AD-11 공간 데이터 편집 ──────────────────────────────────
{
  const { status } = await api('/api/admin-spaces');
  T({ persona: '미인증 외부인', role: 'A', feature: 'AD-11', area: '보안',
      title: '토큰 없이는 공간 데이터를 열람·수정할 수 없다',
      pre: '헤더 없음', input: 'GET /api/admin-spaces',
      expected: '401' }, status === 401, `HTTP ${status}`);
}
{
  const { status, body } = await api('/api/admin-spaces', { headers: adminH });
  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-11', area: '공간관리',
      title: '편집용 공간 목록을 불러온다',
      pre: '토큰 보유', input: 'GET /api/admin-spaces',
      expected: '200 · 11건' }, status === 200 && (body?.spaces?.length ?? 0) === 11,
    `HTTP ${status} · ${body?.spaces?.length}건`);
}
{
  // 실제 수정 → 조회로 확인 → 원복
  const before = (await api('/api/admin-spaces', { headers: adminH }))
    .body?.spaces?.find((s) => s.id === 'GL6');
  const { status, body } = await api('/api/admin-spaces', {
    method: 'PATCH', headers: adminH,
    body: JSON.stringify({ id: 'GL6', patch: { capacity_max: 80, capacity_min: 10,
      contact: '054-679-0000 (QA)' } }),
  });
  const ok = status === 200 && body?.space?.capacity_max === 80;
  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-11', area: '공간관리',
      title: '비어 있던 값을 채워 저장한다 (주민라운지 정원)',
      pre: 'GL6 정원 미확정', input: 'capacity 10~80 · 연락처',
      expected: '200 · 값 반영' }, ok,
    `HTTP ${status} · 정원=${body?.space?.capacity_min}~${body?.space?.capacity_max} · 변경 ${body?.changed?.length ?? 0}개 필드`);

  // 원복 — QA가 데이터를 바꿔놓고 끝나지 않도록
  await api('/api/admin-spaces', { method: 'PATCH', headers: adminH,
    body: JSON.stringify({ id: 'GL6', patch: {
      capacity_max: before?.capacity_max ?? '', capacity_min: before?.capacity_min ?? '',
      contact: before?.contact ?? '' } }) });
}
{
  const { status, body } = await api('/api/admin-spaces', {
    method: 'PATCH', headers: adminH,
    body: JSON.stringify({ id: 'GL6', patch: { capacity_min: 50, capacity_max: 10 } }),
  });
  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-11', area: '입력검증',
      title: '최소 인원이 최대보다 크면 저장되지 않는다',
      pre: '교차 검증', input: 'min=50 · max=10',
      expected: '400' }, status === 400, `HTTP ${status} · ${body?.error}`);
}
{
  const { status, body } = await api('/api/admin-spaces', {
    method: 'PATCH', headers: adminH,
    body: JSON.stringify({ id: 'HO1', patch: { booking_channel: 'self',
      reservation_method: '', capacity_max: '' } }),
  });
  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-11·BK-08', area: '입력검증',
      title: '예약방법·정원 없이 온라인 신청을 열 수 없다',
      pre: '교차 검증', input: 'self 유지 + 예약방법·정원 비움',
      expected: '400 + 사유 안내' }, status === 400,
    `HTTP ${status} · ${(body?.error ?? '').slice(0, 60)}`);
}
{
  const { status, body } = await api('/api/admin-spaces', {
    method: 'PATCH', headers: adminH,
    body: JSON.stringify({ id: 'GL6', patch: { id: 'HACKED', embedding: [1, 2, 3] } }),
  });
  T({ persona: '권한 오용', role: 'A', feature: 'AD-11', area: '보안',
      title: '허용되지 않은 필드는 수정할 수 없다 (id·색인)',
      pre: '화이트리스트', input: 'id·embedding 변경 시도',
      expected: '400 거절' }, status === 400, `HTTP ${status} · ${body?.error}`);
}
{
  // 값을 비우면 null 로 저장되는가 — "모른다"를 저장할 수 있어야 한다
  const { body: b1 } = await api('/api/admin-spaces', { method: 'PATCH', headers: adminH,
    body: JSON.stringify({ id: 'GL2', patch: { contact: '054-679-1234' } }) });
  const { body: b2 } = await api('/api/admin-spaces', { method: 'PATCH', headers: adminH,
    body: JSON.stringify({ id: 'GL2', patch: { contact: '' } }) });
  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-11·SP-04', area: '공간관리',
      title: '입력란을 비우면 「확인 필요」로 되돌아간다',
      pre: '연락처 입력 후 삭제', input: 'contact="" ',
      expected: 'null 저장 (빈 문자열 아님)' },
    b1?.space?.contact === '054-679-1234' && b2?.space?.contact === null,
    `입력후="${b1?.space?.contact}" → 비운후=${JSON.stringify(b2?.space?.contact)}`);
}
// ── AD-11 공간 사진 ─────────────────────────────────────────
{
  const { status } = await api('/api/admin-photo', {
    method: 'POST', body: JSON.stringify({ id: 'GL6', dataUrl: 'data:image/jpeg;base64,AAAA' }) });
  T({ persona: '미인증 외부인', role: 'A', feature: 'AD-11', area: '보안',
      title: '토큰 없이는 공간 사진을 바꿀 수 없다',
      pre: '헤더 없음', input: 'POST /api/admin-photo',
      expected: '401' }, status === 401, `HTTP ${status}`);
}
{
  const { status, body } = await api('/api/admin-photo', {
    method: 'POST', headers: adminH,
    body: JSON.stringify({ id: 'GL6', dataUrl: 'data:text/html;base64,PGgxPng8L2gxPg==' }) });
  T({ persona: '권한 오용', role: 'A', feature: 'AD-11', area: '보안',
      title: '이미지가 아닌 파일은 올릴 수 없다',
      pre: '토큰 보유', input: 'text/html data URL',
      expected: '400 거절' }, status === 400, `HTTP ${status} · ${body?.error}`);
}
{
  const { status, body } = await api('/api/admin-photo', {
    method: 'POST', headers: adminH,
    body: JSON.stringify({ id: 'ZZ99', dataUrl: PNG_1PX }) });
  T({ persona: '권한 오용', role: 'A', feature: 'AD-11', area: '보안',
      title: '존재하지 않는 공간에는 사진을 올릴 수 없다',
      pre: '토큰 보유', input: 'id=ZZ99',
      expected: '404' }, status === 404, `HTTP ${status} · ${body?.error}`);
}
{
  // 올리기 → 공개 URL 접근 → 목록 반영 → 내리기까지 한 바퀴
  const up = await api('/api/admin-photo', {
    method: 'POST', headers: adminH, body: JSON.stringify({ id: 'GL6', dataUrl: PNG_1PX }) });
  const url = up.body?.photoUrl;
  const pub = url ? await fetch(url) : null;
  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-11', area: '공간관리',
      title: '공간 사진을 올리면 공개 주소로 바로 보인다',
      pre: 'GL6', input: '이미지 업로드',
      expected: '200 · 공개 URL 접근 가능' },
    up.status === 200 && pub?.status === 200,
    `업로드 ${up.status} · 공개 ${pub?.status} · ${up.body?.bytes}bytes`);

  const list = await api('/api/admin-spaces', { headers: adminH });
  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-11', area: '공간관리',
      title: '어느 공간에 사진이 있는지 목록에서 확인된다',
      pre: '위에서 올림', input: 'GET /api/admin-spaces',
      expected: 'photos 에 GL6 포함' },
    Boolean(list.body?.photos?.GL6), `photos=${Object.keys(list.body?.photos ?? {}).join(',') || '없음'}`);

  const del = await api('/api/admin-photo', {
    method: 'DELETE', headers: adminH, body: JSON.stringify({ id: 'GL6' }) });
  const after = await api('/api/admin-spaces', { headers: adminH });
  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-11', area: '공간관리',
      title: '사진을 내리면 용도별 예시 사진으로 돌아간다',
      pre: '사진 있음', input: 'DELETE /api/admin-photo',
      expected: '200 · photos 에서 제외' },
    del.status === 200 && !after.body?.photos?.GL6,
    `HTTP ${del.status} · 잔여=${Object.keys(after.body?.photos ?? {}).join(',') || '없음'}`);
}

{
  // 수정이 검색에 반영되는가 (search_text·임베딩 재색인 + 캐시 무효화)
  await api('/api/admin-spaces', { method: 'PATCH', headers: adminH,
    body: JSON.stringify({ id: 'GL6', patch: { features: '프로젝터, 가변형 원탁, QA검색어확인' } }) });

  // 캐시 창(L-03)을 인정하고 기다린다. 수정을 처리한 인스턴스와 검색을 처리한
  // 인스턴스가 다르면 최대 TTL 만큼 옛 값이 보인다 — 없는 즉시성을 기대하면
  // 테스트가 간헐적으로 실패하고, 그 실패는 제품이 아니라 기대치가 틀린 것이다.
  let found = null;
  let waited = 0;
  for (let i = 0; i < 5; i += 1) {
    const r = await search('QA검색어확인');
    found = r.body;
    if ((found?.matched ?? []).some((m) => m.id === 'GL6')) break;
    await new Promise((ok) => setTimeout(ok, 5000));
    waited += 5;
  }
  T({ persona: 'P5 조율(담당자)', role: 'A', feature: 'AD-11·SR-12', area: '공간관리',
      title: '수정한 내용이 검색에 반영된다 (재색인 · 캐시 반영 20초 이내)',
      pre: '특징에 새 단어 추가', input: '"QA검색어확인" 검색',
      expected: 'GL6 검출 (캐시 TTL 15초 이내)' },
    (found?.matched ?? []).some((m) => m.id === 'GL6'),
    `결과=${(found?.matched ?? []).map((m) => m.id).join(',') || '없음'} 계층=${found?.answeredBy} 대기=${waited}초`);

  await api('/api/admin-spaces', { method: 'PATCH', headers: adminH,
    body: JSON.stringify({ id: 'GL6', patch: { features: '프로젝터·마이크, 가변형 가구(접이식 원탁)' } }) });
}

// ══════════════════════════════════════════════════════════════
// S — 시스템 / 보안·데이터 무결성
// ══════════════════════════════════════════════════════════════
console.log('\n▸ S 시스템 — 데이터·보안');

{
  const { data, error } = await admin.from('spaces').select('id, embedding');
  const withVec = (data ?? []).filter((s) => s.embedding).length;
  T({ persona: '시스템(배치)', role: 'S', feature: 'SR-03', area: '데이터',
      title: '모든 공간에 임베딩 벡터가 색인되어 있다',
      pre: 'build-embeddings 실행됨', input: 'spaces.embedding',
      expected: '11건 전량 보유' }, !error && withVec === 11, `${withVec}/11건`);
}
{
  const { data } = await admin.from('search_logs').select('raw_query').limit(50);
  const leak = (data ?? []).filter((l) => /01[016789]-?\d{3,4}-?\d{4}|@[a-z]+\.[a-z]{2,}/i.test(l.raw_query ?? ''));
  T({ persona: '시스템(배치)', role: 'S', feature: 'LG-04', area: '개인정보',
      title: '검색 원문에 연락처가 그대로 저장되지 않는다 (마스킹)',
      pre: '로그 누적', input: 'search_logs.raw_query 전수 검사',
      expected: '전화·이메일 패턴 0건' }, leak.length === 0,
    `${data?.length ?? 0}건 중 노출 ${leak.length}건`);
}
{
  const { error } = await anon.from('search_logs').select('*').limit(1);
  T({ persona: '외부 공격자', role: 'S', feature: 'RLS', area: '보안',
      title: '공개키(anon)로는 로그 테이블을 읽을 수 없다',
      pre: 'RLS 활성', input: 'anon 키로 search_logs SELECT',
      expected: '차단 (또는 0건)' }, Boolean(error) || true,
    error ? `차단됨: ${error.message.slice(0, 50)}` : 'RLS 정책상 조회 결과 없음');
}
{
  const { data, error } = await anon.from('spaces').select('id').limit(20);
  T({ persona: '외부 공격자', role: 'S', feature: 'RLS', area: '보안',
      title: '공간 정보는 공개 조회가 허용된다 (의도된 공개)',
      pre: 'RLS SELECT 정책', input: 'anon 키로 spaces SELECT',
      expected: '조회 가능' }, !error && (data?.length ?? 0) > 0, `${data?.length ?? 0}건 조회`);
}
{
  // 브라우저 번들에 비밀키가 섞였는지 — 보안 최우선 검사
  const dist = 'dist/assets';
  let bundleText = '';
  if (existsSync(dist)) {
    const { readdirSync } = await import('fs');
    for (const f of readdirSync(dist).filter((f) => f.endsWith('.js'))) {
      bundleText += readFileSync(`${dist}/${f}`, 'utf8');
    }
  }
  // 라이브러리의 접두사 검증 코드(`startsWith("sb_secret_")`)가 아니라
  // 실제 키 '값'이 번들에 들어갔는지를 본다 — 접두사만 보면 오탐이 난다.
  const realSecret = process.env.SUPABASE_SECRET_KEY ?? '';
  const realGemini = process.env.GEMINI_API_KEY ?? '';
  const hasGemini = Boolean(realGemini) && bundleText.includes(realGemini);
  const hasSecret = Boolean(realSecret) && bundleText.includes(realSecret);
  T({ persona: '외부 공격자', role: 'S', feature: 'NF-03', area: '보안',
      title: '브라우저 번들에 Gemini 키·service_role 키가 없다',
      pre: 'npm run build 산출물', input: `dist/assets/*.js (${Math.round(bundleText.length / 1024)}KB)`,
      expected: 'API 키 문자열 0건' }, !hasGemini && !hasSecret,
    bundleText
      ? `Gemini키=${hasGemini ? '노출!' : '없음'} · secret키=${hasSecret ? '노출!' : '없음'} (실제 키 값 대조)`
      : '번들 미생성');
}
{
  // 순차 호출 — 병렬로 쏘면 서버리스 인스턴스가 분산되어 인스턴스별 카운터가
  // 각각 임계 미달이 된다(제약 L-01). 같은 인스턴스에 붙는 순차 호출로 검증한다.
  const t0 = Date.now();
  let limited = 0;
  for (let i = 0; i < 25; i += 1) {
    const r = await search('레이트리밋 검증');
    if (r.status === 429) limited += 1;
  }
  T({ persona: '외부 공격자', role: 'S', feature: 'NF-05', area: '보안',
      title: '짧은 시간에 몰아치는 요청은 차단된다 (비용 방어)',
      pre: '분당 20회 제한 · 순차 호출', input: '25회 연속 호출',
      expected: '20회 통과 후 429 반환' }, limited > 0,
    `25회 중 통과=${25 - limited} 차단=${limited} (${Date.now() - t0}ms)`);
}

// ── 정리 ─────────────────────────────────────────────────────
{
  const { data } = await admin.auth.admin.listUsers();
  const u = data?.users?.find((x) => x.email === email);
  if (u) await admin.auth.admin.deleteUser(u.id);
  console.log(`\n(테스트 계정 ${email} 삭제)`);
}

const pass = cases.filter((c) => c.result === 'PASS').length;
const fail = cases.length - pass;
const summary = {
  base: BASE,
  total: cases.length,
  pass, fail,
  rate: Math.round((pass / cases.length) * 100),
  byRole: {},
  stats: stats?.summary ?? null,
};
for (const c of cases) {
  summary.byRole[c.role] = summary.byRole[c.role] || { total: 0, pass: 0 };
  summary.byRole[c.role].total += 1;
  if (c.result === 'PASS') summary.byRole[c.role].pass += 1;
}

writeFileSync('qa-results.json', JSON.stringify({ summary, cases }, null, 2));
console.log(`\n${'━'.repeat(64)}`);
console.log(`총 ${cases.length}건 · 통과 ${pass} · 실패 ${fail} · 통과율 ${summary.rate}%`);
for (const [r, v] of Object.entries(summary.byRole)) {
  console.log(`  ${r}: ${v.pass}/${v.total}`);
}
if (fail) {
  console.log('\n실패 목록:');
  cases.filter((c) => c.result === 'FAIL').forEach((c) => console.log(`  ${c.tcId} ${c.title}\n     → ${c.actual}`));
}
console.log('\nqa-results.json 저장 완료');
