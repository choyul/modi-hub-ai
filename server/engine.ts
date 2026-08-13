/**
 * 런타임 4계층 검색 엔진 — SR-10 (단계적 축퇴)
 *
 *   ① 조건 필터  : 저비용 파서(정규식·사전) → 카테고리·인원 필터. 외부 호출 0
 *   ② 퍼지 검색  : Fuse.js — 오타·띄어쓰기 흡수. 외부 호출 0
 *   ③ 임베딩     : 질의 1회 임베딩 + 사전 계산된 공간 벡터와 코사인 비교
 *   ④ LLM       : 위에서 확신이 없을 때만. 여기서만 생성형 호출
 *
 * 앞 계층에서 답하면 뒤 계층은 실행되지 않는다 → 비용은 질의 난이도에 비례.
 * ④가 실패(키 없음·예산 소진·장애)해도 ①~③ 결과로 응답한다 — 시연 ⓑ.
 *
 * 워크시트 결정(Q3)은 Fuse.js "클라이언트"였으나, 3종 로그·마스킹이 서버에
 * 있어 파이프라인을 한 곳에 두기 위해 같은 라이브러리를 서버에서 돌린다.
 * 비용 0·외부 호출 0 이라는 결정의 본질은 동일하다.
 */
import Fuse from 'fuse.js';
import { cheapParse, HOME_REGION, type CheapParsed } from './parse.js';
import { toJamo } from './hangul.js';
import { getSpaces, type DbSpace } from './db.js';
import { recommendSpaces, type RecommendResult } from './recommend.js';

export type AnsweredBy = 'filter' | 'fuzzy' | 'embedding' | 'llm';

export interface EngineResult extends RecommendResult {
  answeredBy: AnsweredBy;
  llmCalled: boolean;
  /** 봉화 밖 지역 질의에 대한 정직 안내 (SR-11 축소안). null 이면 표시 안 함 */
  regionNotice: string | null;
}

// ── 공통 도우미 ─────────────────────────────────────────────
const bookable = (s: DbSpace) => s.booking_status !== 'closed';

function templateReasoning(s: DbSpace, p: CheapParsed): string {
  const bits: string[] = [];
  if (p.category) bits.push(`${p.category} 용도`);
  if (p.headcount && s.capacity_max != null)
    bits.push(`${p.headcount}명 수용 가능 (${s.capacity_min}~${s.capacity_max}명)`);
  if (!s.verified) bits.push('준공 전 계획값 기준');
  return bits.length
    ? `등록 정보와 조건이 일치합니다 — ${bits.join(' · ')}.`
    : '등록 정보 기준으로 조건과 가까운 공간입니다.';
}

/**
 * 후속 제안은 읽어낸 조건에서만 만든다.
 *
 * 전에는 무엇을 묻든 「인원을 조금 줄여서 다시 검색」이 붙었다. 인원을 말한
 * 적 없는 사람에게는 헛말이고, 헛말이 한 번 보이면 나머지 안내도 같이
 * 의심받는다. 바꿀 수 있는 조건이 없으면 제안도 없는 게 맞다.
 */
function followUpsOf(p: CheapParsed): string[] {
  // 없는 시설을 물었으면 검색어를 어떻게 바꿔도 나오지 않는다.
  // 조건을 만지라고 하는 것은 헛수고를 시키는 일이다. 이 경우 화면에는
  // 바로 아래 수요 전달 창구가 남는다 — 그게 유일하게 쓸모 있는 다음 행동이다.
  if (p.facility) return [];

  const out: string[] = [];
  if (p.headcount) out.push(`인원을 ${p.headcount}명보다 줄여서 다시 검색`);
  if (p.region && p.region !== HOME_REGION) out.push('봉화 안에서 찾아보기');
  if (p.whenText) out.push(`${p.whenText} 말고 다른 때로 찾아보기`);
  if (p.category) out.push('다른 용도로도 찾아보기');
  return out.slice(0, 3);
}

function toParsed(p: CheapParsed) {
  return {
    purpose: p.purpose ?? p.category,
    headcount: p.headcount,
    region: p.region,
    whenText: p.whenText,
    keywords: [] as string[],
  };
}

function regionNoticeOf(p: CheapParsed): string | null {
  if (!p.region || p.region === HOME_REGION) return null;
  return `지금은 봉화군 공간만 등록돼 있습니다. ${p.region} 지역을 찾으신 기록은 남겨두었다가, 봉화 밖 수요가 확인되면 확장 근거로 씁니다.`;
}

// ── 계층 ① 조건 필터 ────────────────────────────────────────
function layerFilter(spaces: DbSpace[], p: CheapParsed): DbSpace[] | null {
  if (!p.category) return null;                       // 조건이 없으면 이 계층은 판단하지 않음
  let cand = spaces.filter((s) => bookable(s) && s.category === p.category);
  if (p.headcount != null) {
    cand = cand.filter(
      (s) => s.capacity_max == null || (s.capacity_max >= p.headcount! &&
             (s.capacity_min == null || s.capacity_min <= p.headcount!))
    );
  }
  if (cand.length === 0) return [];                   // 조건은 읽었는데 맞는 게 없음 → 미충족 후보
  if (cand.length > 6) return null;                   // 너무 넓음 → 다음 계층에 넘김
  // 인원 적합도 순 정렬
  cand.sort((a, b) => (a.capacity_max ?? 999) - (b.capacity_max ?? 999));
  return cand.slice(0, 3);
}

// ── 계층 ② 퍼지 (Fuse.js + 한글 자모 분해) ──────────────────
//
// 한글은 완성형 그대로 비교하면 "숍"/"샵" 같은 한 획 차이가 문자 1개 차이로
// 계산돼 오타를 놓친다. 자모로 풀어 비교하면 편집거리가 실제 체감과 맞는다.
type FuzzyDoc = { s: DbSpace; nameJamo: string; textJamo: string };

let fuseCache: { fuse: Fuse<FuzzyDoc>; size: number } | null = null;

function getFuse(spaces: DbSpace[]) {
  if (fuseCache && fuseCache.size === spaces.length) return fuseCache.fuse;
  const docs: FuzzyDoc[] = spaces.map((s) => ({
    s,
    nameJamo: toJamo(s.name),
    textJamo: toJamo(
      [s.name, s.facility, s.specialty ?? '', ...(s.aliases ?? [])].join(' ')
    ),
  }));
  const fuse = new Fuse(docs, {
    keys: [
      { name: 'nameJamo', weight: 3 },   // 공간명 직접 입력이 주 용도
      { name: 'textJamo', weight: 1 },
    ],
    includeScore: true,
    threshold: 0.32,        // 자모 기준이라 완성형보다 관대해도 오탐이 적다
    distance: 200,          // 자모로 풀면 문자열이 3배 길어지므로 함께 늘린다
    ignoreLocation: true,
    minMatchCharLength: 3,
  });
  fuseCache = { fuse, size: spaces.length };
  return fuse;
}

function layerFuzzy(spaces: DbSpace[], query: string): DbSpace[] {
  const q = toJamo(query);
  if (q.length < 4) return [];          // 너무 짧으면 오탐만 는다
  return getFuse(spaces)
    .search(q)
    .filter((r) => (r.score ?? 1) < 0.28)
    .slice(0, 3)
    .map((r) => r.item.s)
    .filter(bookable);
}

// ── 계층 ③ 임베딩 (질의 1회 임베딩 + 코사인) ─────────────────
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const EMBED_DIM = Number(process.env.GEMINI_EMBED_DIM || 768);

async function embedQuery(text: string): Promise<number[] | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: EMBED_DIM,
        }),
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.embedding?.values ?? null;
  } catch {
    return null;
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

async function layerEmbedding(spaces: DbSpace[], query: string) {
  const qv = await embedQuery(query);
  if (!qv) return { hits: [] as { s: DbSpace; sim: number }[], available: false };
  const scored = spaces
    .filter((s) => bookable(s) && s.embedding)
    .map((s) => ({ s, sim: cosine(qv, s.embedding!) }))
    .sort((a, b) => b.sim - a.sim);
  // 채택 기준은 절대 유사도 하나다.
  //
  // 한때 '1위가 2위를 얼마나 앞서는가(격차)'도 함께 봤다. 보유하지 않은 시설을
  // 물으면 모든 공간이 고만고만해진다는 관찰에서 나온 규칙이었는데, 실제로는
  // 정상 질의를 죽였다 — 「혼자 공부할 곳」은 1위 0.685 / 2위 0.671 로 둘 다
  // 임계를 넘었는데도 격차가 0.014 라는 이유로 전부 탈락해 0건이 됐다.
  //
  // 미보유 질의는 절대 임계만으로 이미 걸러진다(볼링장 최고 0.647, 수영장 0.583).
  // 임계를 넘은 후보가 여럿인 것은 '여러 곳이 다 맞는다'는 뜻이지 잘라낼 신호가
  // 아니다. 20건 평가셋에 맞춰 넣었던 과적합이라 걷어낸다.
  //
  // ※ 0.66 은 평가셋 실측으로 정한 값이다. 질의가 쌓이면 재산정해야 한다.
  const MIN_SIM = 0.66;
  const hits = scored.filter((x) => x.sim >= MIN_SIM).slice(0, 3);
  return { hits, available: true, top: scored.slice(0, 2) };
}

// ── 결과 조립 ───────────────────────────────────────────────
function success(
  spaces: DbSpace[], p: CheapParsed, picks: DbSpace[],
  answeredBy: AnsweredBy, llmCalled: boolean
): EngineResult {
  return {
    parsed: toParsed(p),
    matched: picks.map((s, i) => ({
      id: s.id,
      matchScore: 90 - i * 8,
      reasoning: templateReasoning(s, p),
    })),
    nearAlternatives: [],
    unmetType: null,
    // 찾던 것을 찾은 사람에게 「조건을 바꿔보라」고 할 이유가 없다
    followUps: [],
    answeredBy, llmCalled,
    regionNotice: regionNoticeOf(p),
  };
}

function unmet(
  p: CheapParsed, near: { s: DbSpace; gap: string }[],
  answeredBy: AnsweredBy, llmCalled: boolean, unmetType?: string
): EngineResult {
  // 미충족에도 종류가 있다. 「못 알아들었다」와 「알아들었지만 없다」는
  // 담당자에게 전혀 다른 할 일이다 — 앞은 검색기를 고치고, 뒤는 시설을 늘린다.
  // 한 칸에 섞어 적으면 어느 쪽도 근거가 되지 못한다.
  const type =
    unmetType ??
    (p.region && p.region !== HOME_REGION
      ? `${p.region} 지역 ${p.category ?? '공간'}`
      : p.facility
      ? `미보유 시설 · ${p.facility}`
      : p.category
      ? `${p.whenText ?? ''} ${p.category}`.trim()
      : '분류 미상');

  // 없는 시설을 물었을 때 회의실·카페를 「가까운 공간」이라 내밀지 않는다.
  // 없는 것을 있다고 하진 않지만, 관계없는 것을 대안이라 하는 것도 같은 종류의
  // 거짓말이다. 수영을 물은 사람에게 카페는 대안이 아니다.
  const alts = p.facility ? [] : near;

  return {
    parsed: toParsed(p),
    matched: [],
    nearAlternatives: alts.map((n) => ({
      id: n.s.id, gap: n.gap,
      reasoning: n.s.specialty ?? '용도가 비슷한 공간입니다.',
    })),
    unmetType: type,
    followUps: followUpsOf(p),
    answeredBy, llmCalled,
    regionNotice: regionNoticeOf(p),
  };
}

// ── 메인 ────────────────────────────────────────────────────
export async function searchSpaces(query: string): Promise<EngineResult> {
  const spaces = await getSpaces();
  const p = cheapParse(query);

  // SR-11 축소안: 봉화 밖 지역 질의는 즉시 정직 안내 + 미충족 적재. LLM 불필요
  if (p.region && p.region !== HOME_REGION) {
    return unmet(p, [], 'filter', false);
  }

  // 야간 질의 가드 — 데이터에 운영시간이 없어 ①~③은 "밤에 되는지"를 알 수 없다.
  // 확신하면 거짓말이 되므로, 시간 제약 질의는 ④(LLM)의 판단으로 넘긴다.
  // 야간 '이용' 질의 — 밤에 공간을 쓰겠다는 뜻. 조건필터가 낮 기준으로만
  // 판단하므로 여기서 걸러 미충족으로 보낸다.
  // 단 "하룻밤 묵을" 류는 숙박 질의이지 야간이용 질의가 아니다. 숙박으로
  // 분류된 질의는 제외한다 — 이 구분이 없으면 숙소 검색이 통째로 미충족이 된다.
  const nightQuery = /밤|야간|새벽|심야|밤새/.test(query) && p.category !== '숙박';

  // ① 조건 필터
  const f = layerFilter(spaces, p);
  if (!nightQuery && f && f.length > 0) return success(spaces, p, f, 'filter', false);

  // ①이 "조건을 읽었는데 0건"이라 판정한 경우(예: 30명 김장 주방),
  // 인원을 모르는 ②·③이 그 판정을 뒤집으면 안 된다 → 곧장 ④로 최종 확인.
  const filterSaysZero = f !== null && f.length === 0;

  let fz: DbSpace[] = [];
  let em: Awaited<ReturnType<typeof layerEmbedding>> = { hits: [], available: false };

  if (!filterSaysZero && !nightQuery) {
    // ② 퍼지 — 공간 이름·별칭을 직접 친 경우 (오타 포함)
    fz = layerFuzzy(spaces, query);
    if (fz.length > 0) return success(spaces, p, fz, 'fuzzy', false);

    // ③ 임베딩 — 의미 검색
    em = await layerEmbedding(spaces, query);
    if (em.hits.length > 0)
      return success(spaces, p, em.hits.map((h) => h.s), 'embedding', false);
  }

  // 미보유 시설 — ①~③이 모두 0건이면 ④를 부르지 않는다.
  // LLM 은 데이터에 없는 수영장을 만들어 낼 수 없다. 답이 정해진 질문에
  // 하루 20회뿐인 호출을 쓰는 것은 낭비다. 분류도 여기서 이미 끝났다.
  if (p.facility) return unmet(p, [], em.available ? 'embedding' : 'filter', false);

  // ④ LLM — 확신이 없을 때만. 0건 판정과 유형 분류의 최종 심급
  try {
    const llm = await recommendSpaces(query);
    return {
      ...llm,
      parsed: { ...llm.parsed, region: llm.parsed.region ?? p.region },
      answeredBy: 'llm', llmCalled: true,
      regionNotice: regionNoticeOf(p),
    };
  } catch {
    // ④ 불능 — ③의 낮은 유사도 후보를 근접 대안으로 강등해 미충족 응답 (축퇴)
    // 「가까운」이 가깝다는 뜻이 되도록 기준을 올렸다.
    // 0.45 로 두었더니 「수영할만한 곳」에 카페(0.58)와 소모임실이 대안으로 붙었다.
    // 채택선이 0.66 인데 0.45 를 근접이라 부르는 것은 말이 안 된다 —
    // 채택에는 못 미치지만 실제로 근처인 구간만 남긴다.
    const near = (em.top ?? [])
      .filter((x) => x.sim >= 0.6)
      .map((x) => ({ s: x.s, gap: '조건 완전 일치는 아님 (유사도 기준)' }));
    if (f !== null) {
      // ①이 "조건은 읽었는데 0건"이었던 경우 — 그 판정을 그대로 쓴다
      return unmet(p, near, 'filter', false);
    }
    return unmet(p, near, em.available ? 'embedding' : 'fuzzy', false);
  }
}
