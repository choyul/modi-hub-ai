/**
 * 검색 로그 저장소 (서버 전용).
 *
 * 과제정의서 §3-2 "3종 로그 자동 적재"의 저장 계층.
 *   - 성공 검색: 무엇을 찾아 무엇을 봤는가
 *   - 실패 검색: 무엇을 찾았는데 결과가 없었는가  ← 이 서비스의 목적
 *   - 원문 질문: 사용자가 자연어로 친 문장 그대로
 *
 * 저장 백엔드는 Upstash Redis(REST). Vercel의 Upstash 연동을 붙이면
 * KV_REST_API_URL / KV_REST_API_TOKEN 이 자동으로 주입된다.
 * 미설정 시에는 프로세스 메모리에 임시 보관하며, 그 사실을 응답에 명시한다
 * (사업계획 §TRUST — 모르면 모른다고 답한다. 저장 여부도 마찬가지).
 */

const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

const LOG_KEY = 'modi:searchlog';
const DEMAND_KEY = 'modi:demand';
const RESERVATION_KEY = 'modi:reservation';
const MAX_ENTRIES = 2000;

export const isPersistent = Boolean(REDIS_URL && REDIS_TOKEN);

export interface SearchLog {
  ts: string;
  /** 사용자가 친 문장 그대로 — 유형 분류의 원자재 */
  rawQuery: string;
  parsed: {
    purpose: string | null;
    headcount: number | null;
    region: string | null;
    whenText: string | null;
  };
  outcome: 'success' | 'unmet';
  /** 성공 시 노출된 공간 id들 (관심도) */
  shownSpaceIds: string[];
  /** 실패 시 "없는 시설 유형" */
  unmetType: string | null;
  latencyMs: number;
}

export interface DemandRegistration {
  ts: string;
  /** 어떤 실패 검색에서 등록됐는가 */
  rawQuery: string;
  unmetType: string | null;
  /** 사용자가 명시적으로 동의했을 때만 true — 몰래 수집하지 않는다 */
  consented: true;
  /** 선택 입력. 없으면 null */
  contact: string | null;
  note: string | null;
}

export interface Reservation {
  id: string;
  ts: string;
  spaceId: string;
  /** 신청자 표시명. 실명 인증 체계가 없으므로 화면에 그대로 표기한다 */
  applicant: string;
  useDate: string;
  useTime: string;
  headcount: number;
  purpose: string;
  contact: string | null;
  /** 담당자 승인 전까지는 항상 '승인대기'. 자동 확정하지 않는다 */
  status: '승인대기' | '예약확정' | '반려';
}

/** 메모리 폴백 (서버리스에서는 인스턴스 단위로 휘발) */
const memory: {
  logs: SearchLog[];
  demands: DemandRegistration[];
  reservations: Reservation[];
} = {
  logs: [],
  demands: [],
  reservations: [],
};

async function redis(command: (string | number)[]): Promise<any> {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    throw new Error(`Redis ${command[0]} 실패: ${res.status}`);
  }
  const json = await res.json();
  return json.result;
}

async function push<T>(key: string, bucket: T[], value: T): Promise<void> {
  if (!isPersistent) {
    bucket.unshift(value);
    if (bucket.length > MAX_ENTRIES) bucket.length = MAX_ENTRIES;
    return;
  }
  await redis(['LPUSH', key, JSON.stringify(value)]);
  await redis(['LTRIM', key, 0, MAX_ENTRIES - 1]);
}

async function readAll<T>(key: string, bucket: T[], limit: number): Promise<T[]> {
  if (!isPersistent) return bucket.slice(0, limit);
  const raw: string[] = (await redis(['LRANGE', key, 0, limit - 1])) || [];
  return raw
    .map((r) => {
      try {
        return JSON.parse(r) as T;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as T[];
}

/**
 * 적재 단계 개인정보 자동 제거.
 * 사업계획 위험관리 "검색 로그 개인정보 혼입 → 적재 단계 자동 제거·IP 미저장"의 구현.
 * IP·User-Agent는 애초에 수집하지 않으므로, 질의문에 섞여 들어온 연락처만 마스킹한다.
 */
export function scrub(text: string): string {
  return text
    .replace(/01[016-9][-\s.]?\d{3,4}[-\s.]?\d{4}/g, '[연락처 삭제]')
    .replace(/\b0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}\b/g, '[연락처 삭제]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[이메일 삭제]');
}

export const appendSearchLog = (log: SearchLog) =>
  push(LOG_KEY, memory.logs, { ...log, rawQuery: scrub(log.rawQuery) });

/**
 * contact 는 사용자가 알림받겠다고 직접 적은 값이므로 그대로 보관한다.
 * 반면 rawQuery 는 검색 문장이므로 연락처가 섞여 들어왔다면 마스킹한다.
 */
export const appendDemand = (d: DemandRegistration) =>
  push(DEMAND_KEY, memory.demands, {
    ...d,
    rawQuery: scrub(d.rawQuery),
    note: d.note ? scrub(d.note) : null,
  });

export const readSearchLogs = (limit = 500) =>
  readAll<SearchLog>(LOG_KEY, memory.logs, limit);

export const readDemands = (limit = 500) =>
  readAll<DemandRegistration>(DEMAND_KEY, memory.demands, limit);

export const appendReservation = (r: Reservation) =>
  push(RESERVATION_KEY, memory.reservations, r);

export const readReservations = (limit = 500) =>
  readAll<Reservation>(RESERVATION_KEY, memory.reservations, limit);
