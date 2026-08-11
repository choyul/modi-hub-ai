/**
 * 계층 ①용 저비용 조건 파서 — LLM 없이 정규식·사전으로 뽑는다.
 * 완벽할 필요 없다. 여기서 못 뽑으면 다음 계층이 받는다.
 */

export interface CheapParsed {
  purpose: string | null;
  category: string | null;   // spaces.category 7종 중 하나
  headcount: number | null;
  region: string | null;     // 질의에 언급된 지역 (봉화 포함)
  whenText: string | null;
}

/** 봉화 데이터만 보유. 그 밖의 지역이 언급되면 SR-11 정직 안내 대상 */
export const HOME_REGION = '봉화';
const REGIONS = ['봉화', '영주', '안동', '예천', '울진', '영양', '태백', '문경', '대구', '서울'];

const CATEGORY_KEYWORDS: [string, string[]][] = [
  ['키친·조리',   ['김장', '요리', '주방', '조리', '베이킹', '반찬', '발효', '식품']],
  ['숙박',        ['숙박', '1박', '묵을', '잘 곳', '잘곳', '게스트하우스', '민박', '숙소']],
  ['회의·교육',   ['회의', '세미나', '워크숍', '워크샵', '교육', '강의', '강연', '설명회', '총회', '미팅']],
  ['공방·체험',   ['공예', '체험', '목공', '염색', '만들기', '공방', '실습']],
  ['전시·공연',   ['전시', '공연', '상영', '발표회', '촬영', '개인전', '영화']],
  ['카페·라운지', ['카페', '코워킹', '노트북', '책 읽', '책읽', '스터디', '작업할']],
  ['야외',        ['야외', '마당', '플리마켓', '텃밭', '옥상']],
];

export function cheapParse(query: string): CheapParsed {
  const q = query.trim();

  // 인원: "8명", "15인", "여덟명"까지는 욕심내지 않는다
  const mCount = q.match(/(\d{1,3})\s*(명|인|人)/);
  const headcount = mCount ? parseInt(mCount[1], 10) : null;

  const region = REGIONS.find((r) => q.includes(r)) ?? null;

  let category: string | null = null;
  let purpose: string | null = null;
  for (const [cat, words] of CATEGORY_KEYWORDS) {
    const hit = words.find((w) => q.includes(w));
    if (hit) { category = cat; purpose = hit; break; }
  }

  const mWhen = q.match(/(오늘|내일|주말|평일|[0-9]{1,2}월|밤|저녁|야간|아침|오전|오후)/);
  const whenText = mWhen ? mWhen[1] : null;

  return { purpose, category, headcount, region, whenText };
}
