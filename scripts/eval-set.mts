/**
 * QA-01 평가셋 — "AI를 95% 걷어낸 대가로 정확도를 얼마나 잃었는가"를 수치로 답한다.
 *   npx tsx scripts/eval-set.mts
 *
 * 방법
 *   같은 질의 20건을 두 경로로 각각 돌려 정답과 대조한다.
 *     A. 현행 4계층 축퇴 (searchSpaces)   — ①필터 ②퍼지 ③임베딩이 답하면 LLM 미호출
 *     B. LLM 단독        (recommendSpaces) — 매 건 Gemini 호출 (통상 구조의 대조군)
 *
 * 정답(ground truth)은 운영계획서 v3를 읽고 사람이 판정해 고정했다. 모델이 만든
 * 정답으로 모델을 채점하면 아무것도 검증되지 않으므로, 정답 근거를 함께 적어 둔다.
 *
 * 0건이 정답인 질의(보유하지 않은 시설·타 지역)를 4건 포함한다. 이 서비스에서
 * '없다고 답하는 것'은 실패가 아니라 미충족 수요 수집의 입구이므로 정확도의 일부다.
 */
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';
dotenv.config({ path: '.env.local' });

const { searchSpaces } = await import('../server/engine.js');
const { recommendSpaces } = await import('../server/recommend.js');

interface EvalItem {
  no: number;
  query: string;
  truth: string[];        // 정답 공간 ID (빈 배열 = 0건이 정답)
  kind: string;           // 난이도 유형
  basis: string;          // 정답 근거 (운영계획서)
}

const SET: EvalItem[] = [
  { no: 1, query: '부녀회 8명이 김장할 공간 있을까요?', truth: ['GL3'], kind: '평이·목적',
    basis: '3F 센트럴 키친 = 식품 제조가공 거점 (계획서 Ⅲ-3F)' },
  { no: 2, query: '6명이 회의할 수 있는 방', truth: ['GL4M', 'GL6'], kind: '평이·조건',
    basis: '4F 모임방 6석 / 6F 주민라운지 다목적 대관' },
  { no: 3, query: '노트북 들고 조용히 일할 곳', truth: ['GL4'], kind: '평이·목적',
    basis: '4F 봉화의 작업실 = 정숙 구역 · 콘센트·개별조명' },
  { no: 4, query: '공예 체험 해보고 싶어요', truth: ['GL5'], kind: '평이·목적',
    basis: '5F 작가 공방·체험실 = 비식품 공예·미술·사진 체험' },
  { no: 5, query: '하룻밤 묵을 곳', truth: ['GL7'], kind: '평이·목적',
    basis: '7F 게스트하우스 (개관 전이나 공간으로는 존재)' },
  { no: 6, query: '전시 보러 갈 만한 곳', truth: ['GL5G'], kind: '평이·목적',
    basis: '5F 작가 전시·판매실 = 상시 개방·관람 무료' },
  { no: 7, query: '어르신 돌봄 프로그램 하는 데', truth: ['GL2'], kind: '평이·목적',
    basis: '2F 다함께 노인돌봄센터' },
  { no: 8, query: '돌잔치 할 만한 넓은 공간', truth: ['GL6'], kind: '중간·유추',
    basis: '6F 주민라운지 — 계획서에 돌잔치·소규모 축하연 명시' },
  { no: 9, query: '스터디 모임 3명이서', truth: ['GL4M'], kind: '중간·조건',
    basis: '4F 모임방 = 대화 가능한 유일 구역, 2~6명' },
  { no: 10, query: '밀키트 만드는 주방 빌릴 수 있나요', truth: ['GL3'], kind: '중간·용어',
    basis: '3F CK = 밀키트 제조·위탁판매' },
  { no: 11, query: '봉하의 자겁실', truth: ['GL4'], kind: '어려움·오타',
    basis: '"봉화의 작업실" 오타 (자모 2곳 변형)' },
  { no: 12, query: '게스트하우쓰', truth: ['GL7'], kind: '어려움·오타',
    basis: '"게스트하우스" 오타' },
  { no: 13, query: '애들 데리고 뭐 만들기 하는 거', truth: ['GL5'], kind: '어려움·구어체',
    basis: '체험 프로그램 — 키워드 사전에 없는 표현' },
  { no: 14, query: '커피 마시면서 책 읽을 데 없나', truth: ['GL4'], kind: '어려움·구어체',
    basis: '4F = 음료 제공 + 책장(F구역) + 독서' },
  { no: 15, query: '세미나 열 장소가 필요합니다', truth: ['GL6', 'GL4M'], kind: '중간·유추',
    basis: '6F 세미나↔연회 전환 / 4F 모임방 소회의' },
  { no: 16, query: '20명 단체 공예 수업', truth: ['GL5'], kind: '어려움·복합조건',
    basis: '5F 체험실 단체 20명 시 34㎡ (계획서 5-10 B구역)' },
  { no: 17, query: '작가가 작업할 공방 임대', truth: ['GL5'], kind: '어려움·복합조건',
    basis: '5F 입주 공방 4실 (관리위탁·제3자 사용수익)' },
  { no: 18, query: '수영장 빌릴 수 있나요', truth: [], kind: '경계·미보유',
    basis: '거점시설에 체육시설 없음 → 0건이 정답' },
  { no: 19, query: '영주에 20명 회의실 있나요', truth: [], kind: '경계·타지역',
    basis: '봉화 데이터만 보유 → 0건 + 정직 안내가 정답' },
  { no: 20, query: '볼링장이나 당구장', truth: [], kind: '경계·미보유',
    basis: '해당 시설 없음 → 0건이 정답' },
];

/**
 * 홀드아웃 10건 — 튜닝이 끝난 뒤에 새로 쓴 질의다. 여기에 맞춰 코드를 고치지 않는다.
 *
 * 위 20건은 결함을 찾는 데 썼고 그 결과로 임계값·분류사전을 손봤다. 같은 20건으로
 * 다시 재면 100%가 나오는 것이 당연하므로(과적합), 손대지 않은 질의로 한 번 더 잰다.
 * 이 점수가 실제 성능에 더 가깝다.
 */
const HOLDOUT: EvalItem[] = [
  { no: 101, query: '김치 담글 데', truth: ['GL3'], kind: '홀드아웃', basis: '3F 센트럴 키친' },
  { no: 102, query: '회의할 데 좀 알려줘', truth: ['GL4M', 'GL6'], kind: '홀드아웃', basis: '4F 모임방 / 6F 라운지' },
  { no: 103, query: '책 보면서 시간 보낼 곳', truth: ['GL4'], kind: '홀드아웃', basis: '4F 작업실 — 책장·정숙' },
  { no: 104, query: '도자기 배우고 싶어요', truth: ['GL5'], kind: '홀드아웃', basis: '5F 체험 — 도자(성형 공정) 가능 업종' },
  { no: 105, query: '민박 같은 거 있나요', truth: ['GL7'], kind: '홀드아웃', basis: '7F 게스트하우스' },
  { no: 106, query: '작품 구경하고 살 수 있는 곳', truth: ['GL5G'], kind: '홀드아웃', basis: '5F 전시·판매실' },
  { no: 107, query: '경로당 같은 시설', truth: ['GL2'], kind: '홀드아웃', basis: '2F 노인돌봄센터' },
  { no: 108, query: '동호회 정기모임 장소', truth: ['GL6', 'GL4M'], kind: '홀드아웃', basis: '6F 동호회 대관 명시' },
  { no: 109, query: '탁구장 있나요', truth: [], kind: '홀드아웃·경계', basis: '체육시설 미보유 → 0건' },
  { no: 110, query: '안동에 세미나실 있나요', truth: [], kind: '홀드아웃·경계', basis: '타 지역 → 0건' },
];

function score(pred: string[], truth: string[]) {
  if (truth.length === 0) {
    const ok = pred.length === 0;
    return { hit: ok, precision: ok ? 1 : 0, recall: ok ? 1 : 0 };
  }
  const inter = pred.filter((p) => truth.includes(p));
  return {
    hit: inter.length > 0,
    precision: pred.length ? inter.length / pred.length : 0,
    recall: inter.length / truth.length,
  };
}
const f1 = (p: number, r: number) => (p + r === 0 ? 0 : (2 * p * r) / (p + r));
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

const rows: any[] = [];
console.log(`\nQA-01 평가셋 ${SET.length}건 — 4계층 vs LLM 단독\n${'━'.repeat(76)}`);

for (const item of SET) {
  // A. 현행 4계층
  const tA = Date.now();
  const a = await searchSpaces(item.query);
  const msA = Date.now() - tA;
  const predA = (a.matched ?? []).map((m: any) => m.id);
  const sA = score(predA, item.truth);

  // B. LLM 단독 (대조군)
  let predB: string[] = [];
  let msB = 0;
  let errB = '';
  let blockedB = false;          // 할당량 차단 — 모델의 오답이 아니라 '측정하지 못함'
  try {
    const tB = Date.now();
    const b = await recommendSpaces(item.query);
    msB = Date.now() - tB;
    predB = (b.matched ?? []).map((m: any) => m.id);
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    blockedB = /429|quota|RESOURCE_EXHAUSTED/i.test(msg);
    errB = blockedB ? '일일 한도 초과(429)' : msg.slice(0, 60) || '오류';
  }
  const sB = score(predB, item.truth);

  rows.push({
    ...item,
    truthStr: item.truth.length ? item.truth.join(',') : '(0건)',
    a: { pred: predA.join(',') || '(0건)', ...sA, ms: msA, layer: a.answeredBy, llm: a.llmCalled },
    b: { pred: errB ? `[${errB}]` : (predB.join(',') || '(0건)'), ...sB, ms: msB, blocked: blockedB, err: errB },
  });

  const mk = (s: any) => (s.hit ? '○' : '✗');
  console.log(
    `${String(item.no).padStart(2)}. ${item.query.slice(0, 22).padEnd(24)} ` +
    `정답=${(item.truth.join(',') || '0건').padEnd(10)} ` +
    `4계층 ${mk(sA)} ${(predA.join(',') || '0건').padEnd(10)} [${a.answeredBy}${a.llmCalled ? '·LLM' : ''}] ${String(msA).padStart(5)}ms  |  ` +
    (blockedB ? `LLM － 측정불가(일일한도)` : `LLM ${mk(sB)} ${(predB.join(',') || '0건').padEnd(10)} ${String(msB).padStart(5)}ms`)
  );
}

// ── 홀드아웃 실행 (4계층만 — LLM 대조군은 할당량 소진) ────────
console.log(`\n홀드아웃 ${HOLDOUT.length}건 — 튜닝에 쓰지 않은 질의\n${'─'.repeat(76)}`);
const hRows: any[] = [];
for (const item of HOLDOUT) {
  const t0 = Date.now();
  const a = await searchSpaces(item.query);
  const ms = Date.now() - t0;
  const pred = (a.matched ?? []).map((m: any) => m.id);
  const s = score(pred, item.truth);
  hRows.push({ ...item, truthStr: item.truth.join(',') || '(0건)',
    a: { pred: pred.join(',') || '(0건)', ...s, ms, layer: a.answeredBy, llm: a.llmCalled } });
  console.log(
    `${item.no}. ${item.query.slice(0, 20).padEnd(22)} 정답=${(item.truth.join(',') || '0건').padEnd(10)} ` +
    `${s.hit ? '○' : '✗'} ${(pred.join(',') || '0건').padEnd(10)} [${a.answeredBy}${a.llmCalled ? '·LLM' : ''}] ${String(ms).padStart(5)}ms`);
}
const H = (() => {
  const n = hRows.length;
  const hit = hRows.filter((r) => r.a.hit).length;
  const p = hRows.reduce((s, r) => s + r.a.precision, 0) / n;
  const rc = hRows.reduce((s, r) => s + r.a.recall, 0) / n;
  return { n, hit, hitRate: hit / n, precision: p, recall: rc, f1: f1(p, rc),
           avgMs: Math.round(hRows.reduce((s, r) => s + r.a.ms, 0) / n),
           llmCalls: hRows.filter((r) => r.a.llm).length };
})();

// ── 집계 ─────────────────────────────────────────────────────
function agg(key: 'a' | 'b') {
  // 측정하지 못한 건(할당량 차단)은 모수에서 뺀다. 차단을 오답으로 세면
  // 대조군을 부당하게 낮게 만들어 결론이 거짓이 된다.
  const src = rows.filter((r) => !r[key].blocked);
  const n = src.length;
  if (n === 0) return { hit: 0, hitRate: 0, precision: 0, recall: 0, f1: 0, avgMs: 0, n: 0, blocked: rows.length };
  const hit = src.filter((r) => r[key].hit).length;
  const p = src.reduce((s, r) => s + r[key].precision, 0) / n;
  const rc = src.reduce((s, r) => s + r[key].recall, 0) / n;
  const ms = Math.round(src.reduce((s, r) => s + r[key].ms, 0) / n);
  return { hit, hitRate: hit / n, precision: p, recall: rc, f1: f1(p, rc), avgMs: ms,
           n, blocked: rows.length - n };
}
const A = agg('a');
const B = agg('b');
const llmCalls = rows.filter((r) => r.a.llm).length;

console.log(`\n${'━'.repeat(76)}`);
console.log('                     적중률      정밀도     재현율     F1       평균응답   LLM호출');
console.log(`  A. 현행 4계층(${A.n}건)  ${pct(A.hitRate).padStart(6)}   ${pct(A.precision).padStart(7)}  ${pct(A.recall).padStart(7)}  ${pct(A.f1).padStart(6)}   ${String(A.avgMs).padStart(5)}ms   ${llmCalls}/${rows.length}건`);
console.log(`  B. LLM 단독(${B.n}건)   ${pct(B.hitRate).padStart(6)}   ${pct(B.precision).padStart(7)}  ${pct(B.recall).padStart(7)}  ${pct(B.f1).padStart(6)}   ${String(B.avgMs).padStart(5)}ms   ${B.n}/${rows.length}건`);
if (B.blocked > 0) {
  console.log(`\n  ※ LLM 단독은 ${rows.length}건 중 ${B.blocked}건이 일일 한도(무료 20건/일)로 측정되지 않았다.`);
  console.log(`     차단을 오답으로 세지 않고 모수에서 제외했다 — 남은 ${B.n}건만의 성적이다.`);
  console.log(`     '한도 때문에 못 돌았다'는 사실 자체가 매 검색 LLM 구조의 실측 한계다.`);
}

// 계층별 성적 — 어느 계층이 어디까지 감당하는가
const byLayer: Record<string, { n: number; hit: number }> = {};
for (const r of rows) {
  const k = r.a.layer;
  byLayer[k] = byLayer[k] || { n: 0, hit: 0 };
  byLayer[k].n += 1;
  if (r.a.hit) byLayer[k].hit += 1;
}
console.log(`  H. 홀드아웃(${H.n}건)   ${pct(H.hitRate).padStart(6)}   ${pct(H.precision).padStart(7)}  ${pct(H.recall).padStart(7)}  ${pct(H.f1).padStart(6)}   ${String(H.avgMs).padStart(5)}ms   ${H.llmCalls}/${H.n}건`);
console.log(`     ↑ 튜닝에 쓰지 않은 질의. A(${pct(A.hitRate)})와의 차이가 과적합의 크기다.`);

console.log('\n  계층별 처리량과 적중률');
const LAYER_LABEL: Record<string, string> = {
  filter: '① 조건필터', fuzzy: '② 퍼지', embedding: '③ 임베딩', llm: '④ LLM',
};
for (const [k, v] of Object.entries(byLayer)) {
  console.log(`    ${(LAYER_LABEL[k] ?? k).padEnd(12)} ${v.n}건 처리 · 적중 ${v.hit}/${v.n} (${pct(v.hit / v.n)})`);
}

writeFileSync('eval-results.json', JSON.stringify({
  set: SET.length, A, B, H, llmCalls, byLayer, rows, holdout: hRows,
  quotaNote: 'Gemini 2.5 Flash 무료 티어 = GenerateRequestsPerDayPerProjectPerModel 20건/일. ' +
             'LLM 단독 대조군은 이 한도로 측정 불가.',
}, null, 2));
console.log('\neval-results.json 저장 완료');
