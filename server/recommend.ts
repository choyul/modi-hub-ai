/**
 * 공간 추천 코어 로직 (서버 전용).
 *
 * 이 파일은 반드시 서버에서만 실행된다. 브라우저 번들에 포함되면
 * GEMINI_API_KEY 가 그대로 노출되므로 클라이언트에서 import 하지 말 것.
 *
 * Vercel(api/recommend-spaces.ts)과 로컬 dev 서버(server.ts)가 같은 함수를 쓴다.
 */

import { GoogleGenAI } from '@google/genai';
import spacesData from '../src/data/spaces.json';

export interface ParsedQuery {
  /** 무엇을 하려는가 — 김장, 워크숍, 전시 등 */
  purpose: string | null;
  /** 인원 (숫자로 확정 가능할 때만) */
  headcount: number | null;
  /** 지역 — 봉화 / 영주 / 안동 / 예천 등. 언급 없으면 null */
  region: string | null;
  /** 날짜·시간대에 대한 언급 원문 */
  whenText: string | null;
  keywords: string[];
}

export interface MatchedSpace {
  id: string;
  matchScore: number;
  reasoning: string;
}

export interface NearAlternative {
  id: string;
  /** 어떤 조건을 못 채우는지 — 사용자에게 그대로 보여준다 */
  gap: string;
  reasoning: string;
}

export interface RecommendResult {
  parsed: ParsedQuery;
  /** 조건을 실제로 만족하는 공간. 없으면 빈 배열 = 미충족 수요 */
  matched: MatchedSpace[];
  /** 완전 일치가 없을 때의 근접 대안 (실패 3겹 응답 ①) */
  nearAlternatives: NearAlternative[];
  /** 결과 0건일 때 "없는 시설 유형" 한 줄 분류. 성공 시 null */
  unmetType: string | null;
  followUps: string[];
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/** LLM에 넘길 최소 필드만 추린다 (토큰 절약 + 불필요한 정보 노출 방지) */
function lightweightSpaces() {
  return spacesData.spaces.map((s: any) => ({
    id: s.id,
    sigungu: s.sigungu ?? '봉화군',
    facility: s.facility,
    name: s.name,
    category: s.category,
    capacity:
      s.capacity_max == null ? '미확인' : `${s.capacity_min}~${s.capacity_max}명`,
    features: s.features,
    specialty: s.specialty || '',
    fee:
      s.fee_per_hour != null
        ? s.fee_per_hour === 0
          ? '무료'
          : `${s.fee_per_hour}원/시간`
        : s.fee_per_night != null
        ? `${s.fee_per_night}원/1박`
        : '미확인',
    owner_dept: s.owner_dept,
    // 값이 확인되지 않은 공간임을 모델에게도 알린다
    info_status: s.verified ? '확인됨' : s.capacity_max == null ? '미확인' : '준공 전 계획값',
  }));
}

const SYSTEM_RULES = `당신은 경북 봉화군 MODI Hub 공간 안내 담당자입니다.
아래 "공간 데이터"에 실제로 존재하는 공간만 다룹니다. 데이터에 없는 공간을 지어내지 마십시오.

가장 중요한 규칙:
- 사용자의 조건(용도·인원·지역·시간)을 **모두** 만족하는 공간만 matched 에 넣습니다.
- 만족하는 공간이 하나도 없으면 matched 는 반드시 **빈 배열**이어야 합니다.
  억지로 채우지 마십시오. "결과 없음"은 오답이 아니라 이 서비스가 수집하려는 정보입니다.
- matched 가 비었을 때만 nearAlternatives 에 조건을 일부 못 채우는 후보를 최대 2개 넣고,
  각각 gap 에 "무엇이 모자라는지"를 한 문장으로 적습니다. (예: "수용 20명으로 요청 30명보다 작음")
- matched 가 비었을 때 unmetType 에 "없는 시설 유형"을 짧은 명사구로 적습니다.
  (예: "야간 운영 회의공간", "반려동물 동반 공간", "30명 이상 단체 식사공간")
  matched 가 하나라도 있으면 unmetType 은 null 입니다.
- matchScore 는 조건 일치도(0~100)이며 근거 없이 90 이상을 남발하지 마십시오.
- 지역이 명시됐는데 데이터에 그 지역 공간이 없으면 matched 는 빈 배열이고
  unmetType 에 "<지역> 내 <유형>" 형태로 적습니다.
- info_status 가 "미확인"인 공간은 수용 인원·이용료가 아직 확인되지 않았습니다.
  용도가 맞으면 추천하되, reasoning 첫 문장에 반드시 "이용 조건이 아직 확인되지 않은 공간입니다"를
  넣고 matchScore 를 70 이하로 둡니다. 확인되지 않은 수치를 지어내지 마십시오.`;

function buildPrompt(query: string) {
  return `${SYSTEM_RULES}

공간 데이터:
${JSON.stringify(lightweightSpaces(), null, 1)}

사용자 요청 원문: "${query}"

아래 JSON 스키마로만 응답하십시오.
{
  "parsed": { "purpose": "문자열 또는 null", "headcount": 숫자 또는 null, "region": "문자열 또는 null", "whenText": "문자열 또는 null", "keywords": ["문자열"] },
  "matched": [ { "id": "데이터의 정확한 id", "matchScore": 0-100, "reasoning": "1-2문장" } ],
  "nearAlternatives": [ { "id": "데이터의 정확한 id", "gap": "못 채우는 조건", "reasoning": "1문장" } ],
  "unmetType": "문자열 또는 null",
  "followUps": ["조건을 바꿔 다시 검색해볼 문장 2개"]
}`;
}

const VALID_IDS = new Set(spacesData.spaces.map((s: any) => s.id));

/** 모델이 없는 id를 지어내는 경우를 걸러낸다 */
function sanitize(raw: any): RecommendResult {
  const matched = Array.isArray(raw?.matched)
    ? raw.matched.filter((m: any) => VALID_IDS.has(m?.id)).slice(0, 3)
    : [];
  const nearAlternatives = Array.isArray(raw?.nearAlternatives)
    ? raw.nearAlternatives.filter((m: any) => VALID_IDS.has(m?.id)).slice(0, 2)
    : [];

  return {
    parsed: {
      purpose: raw?.parsed?.purpose ?? null,
      headcount:
        typeof raw?.parsed?.headcount === 'number' ? raw.parsed.headcount : null,
      region: raw?.parsed?.region ?? null,
      whenText: raw?.parsed?.whenText ?? null,
      keywords: Array.isArray(raw?.parsed?.keywords) ? raw.parsed.keywords : [],
    },
    matched,
    // 성공했으면 근접 대안은 보여주지 않는다
    nearAlternatives: matched.length > 0 ? [] : nearAlternatives,
    unmetType: matched.length > 0 ? null : raw?.unmetType ?? '분류 미상',
    followUps: Array.isArray(raw?.followUps) ? raw.followUps.slice(0, 3) : [],
  };
}

export async function recommendSpaces(query: string): Promise<RecommendResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 서버에 설정되어 있지 않습니다.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(query),
    config: { responseMimeType: 'application/json', temperature: 0.2 },
  });

  return sanitize(JSON.parse(response.text || '{}'));
}
