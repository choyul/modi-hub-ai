import spacesData from '../data/spaces.json';

/**
 * 공간 데이터 표시 헬퍼.
 *
 * 원칙: 모르는 값은 그럴듯하게 채우지 않고 "확인 필요"라고 쓴다.
 * 준공(2026.12) 전이라 MODI 3개소 수치는 계획값이고, 농업가공교육관은
 * 소관 부서가 달라 아직 값 자체가 없다. 그 차이를 화면에서 숨기지 않는다.
 */

export type Space = (typeof spacesData.spaces)[number];

export const spaces = spacesData.spaces as Space[];

export const findSpace = (id: string) => spaces.find((s) => s.id === id);

export function capacityLabel(s: Space): string {
  if (s.capacity_min == null || s.capacity_max == null) return '수용 인원 확인 필요';
  return `${s.capacity_min}~${s.capacity_max}명`;
}

export function feeLabel(s: Space): string {
  if (s.fee_per_hour != null) {
    return s.fee_per_hour === 0 ? '무료' : `${s.fee_per_hour.toLocaleString()}원/시간`;
  }
  if ((s as any).fee_per_night != null) {
    return `${(s as any).fee_per_night.toLocaleString()}원/1박`;
  }
  return '이용료 확인 필요';
}

export function leadDaysLabel(s: Space): string {
  if (s.reservation_lead_days == null) return '신청 절차 확인 필요';
  return `예약 ${s.reservation_lead_days}일 전 신청`;
}

/** 값이 하나라도 비어 있으면 정보가 불완전한 공간 */
export function isIncomplete(s: Space): boolean {
  return s.capacity_max == null || s.reservation_method == null;
}

// ── 예약 채널 (BK-08·09·10) ─────────────────────────────────
export interface BookingInfo {
  channel: 'self' | 'ota' | 'phone' | 'unknown';
  status: 'unknown' | 'pending' | 'live' | 'closed';
  links: { name: string; url: string }[];
  plannedChannels: string[];
  openFrom: string | null;
}

export function bookingOf(s: Space): BookingInfo {
  const a = s as any;
  return {
    channel: a.booking_channel ?? 'unknown',
    status: a.booking_status ?? 'unknown',
    links: (a.booking_links ?? []) as { name: string; url: string }[],
    plannedChannels: (a.planned_channels ?? []) as string[],
    openFrom: a.open_from ?? null,
  };
}

/** 자체 신청 가능 여부 — self 채널이고 절차가 확인된 공간만 (채널 가드) */
export function canApply(s: Space): boolean {
  const b = bookingOf(s);
  return (
    b.channel === 'self' && b.status === 'live' &&
    s.reservation_method != null && s.capacity_max != null
  );
}

// ── 신뢰 등급 (SP-10) ───────────────────────────────────────
const TRUST_LABEL: Record<string, string> = {
  official: '공식 대장',
  owner: '운영자 직접 확인',
  confirmed: '확인됨',
  reported: '주민 제보',
  unverified: '확인 전',
};

export function trustLabel(s: Space): string {
  return TRUST_LABEL[(s as any).trust_level ?? 'unverified'] ?? '확인 전';
}
