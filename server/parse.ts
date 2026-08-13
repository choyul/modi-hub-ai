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
  /** 우리가 갖고 있지 않은 시설 유형 (수영장·볼링장 …). 없으면 null */
  facility: string | null;
}

/** 봉화 데이터만 보유. 그 밖의 지역이 언급되면 SR-11 정직 안내 대상 */
export const HOME_REGION = '봉화';
const REGIONS = ['봉화', '영주', '안동', '예천', '울진', '영양', '태백', '문경', '대구', '서울'];

const CATEGORY_KEYWORDS: [string, string[]][] = [
  // '김치'·'도자기'는 홀드아웃 평가에서 드러난 누락이다. 사전 기반 계층의 한계는
  // 이렇게 '안 적어둔 말'에서 나오며, 고칠 때마다 새 질의로 다시 재야 한다.
  ['키친·조리',   ['김장', '김치', '요리', '주방', '조리', '베이킹', '반찬', '발효', '식품', '밀키트']],
  ['숙박',        ['숙박', '1박', '묵을', '잘 곳', '잘곳', '게스트하우스', '민박', '숙소']],
  // '모임'은 카페(스터디)보다 앞에 둔다 — 계획서상 대화가 되는 곳은 모임방뿐이고,
  // 4층 작업실은 정숙 구역이라 "스터디 모임"의 답이 될 수 없다.
  ['회의·교육',   ['회의', '세미나', '워크숍', '워크샵', '교육', '강의', '강연', '설명회', '총회', '미팅', '모임']],
  ['공방·체험',   ['공예', '체험', '목공', '염색', '만들기', '공방', '실습', '도자기', '도예', '가죽', '뜨개']],
  ['전시·공연',   ['전시', '공연', '상영', '발표회', '촬영', '개인전', '영화']],
  ['카페·라운지', ['카페', '코워킹', '노트북', '책 읽', '책읽', '스터디', '작업할', '공부', '독서실', '자습']],
  ['돌봄',        ['돌봄', '어르신', '노인', '경로', '세대교류']],
];

/**
 * 우리가 갖고 있지 않은 시설 유형.
 *
 * 「수영할 곳」을 물으면 지금까지는 「분류 미상」으로 적혔다. 못 알아들었다는 뜻이다.
 * 그런데 우리는 알아들었다 — 수영장이 없을 뿐이다. 이 둘은 담당자에게 전혀 다른
 * 정보다. 앞은 검색기를 고칠 일이고, 뒤는 예산을 세울 일이다.
 *
 * 「수영장 요청 10건」이 통계로 남아야 시설 확충 근거가 된다. 못 알아들은
 * 질문 더미에 섞이면 그 근거가 사라진다.
 *
 * 여기 적힌 것은 도시재생 거점시설 11곳에 확실히 없는 것들만이다. 어중간한
 * 것을 넣으면 있는 공간을 없다고 답하게 된다.
 */
const ABSENT_FACILITIES: [string, string[]][] = [
  ['수영장',   ['수영', '수영장', '풀장', '물놀이']],
  ['체육시설', ['볼링', '헬스', '체육관', '농구', '배드민턴', '탁구장', '클라이밍', '암벽', '풋살', '당구', '골프']],
  ['영화관',   ['영화관', '극장', '상영관']],
  ['야외시설', ['캠핑', '글램핑', '야영', '바비큐장', '오토캠핑']],
  ['목욕시설', ['사우나', '찜질방', '목욕탕', '온천']],
  ['노래연습장', ['노래방', '노래연습장', '코인노래']],
  ['주차장',   ['주차장', '주차 공간']],
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

  // 미보유 시설. 용도가 잡힌 질의는 건드리지 않는다 —
  // 「수영장 옆 회의실」은 회의실을 찾는 질문이지 수영장을 찾는 질문이 아니다.
  let facility: string | null = null;
  if (!category) {
    for (const [name, words] of ABSENT_FACILITIES) {
      if (words.some((w) => q.includes(w))) { facility = name; break; }
    }
  }

  return { purpose, category, headcount, region, whenText, facility };
}
