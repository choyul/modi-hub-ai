import { useCallback, useEffect, useState } from 'react';

/**
 * 담당자 화면 공통 데이터 소스.
 * /api/stats 는 하드코딩 상수가 아니라 실제 적재된 검색 로그를 집계해 돌려준다.
 * 원문 질의·연락처는 ADMIN_TOKEN 이 맞을 때만 내려온다.
 */

export interface Counted {
  label: string;
  count: number;
}

export interface SearchLogRow {
  ts: string;
  rawQuery: string;
  parsed: {
    purpose: string | null;
    headcount: number | null;
    region: string | null;
    whenText: string | null;
  };
  outcome: 'success' | 'unmet';
  shownSpaceIds: string[];
  unmetType: string | null;
  latencyMs: number;
}

export interface DemandRow {
  ts: string;
  rawQuery: string;
  unmetType: string | null;
  contact: string | null;
}

export interface ReservationRow {
  id: string;
  ts: string;
  spaceId: string;
  applicant: string;
  useDate: string;
  headcount: number;
  purpose: string;
  status: string;
}

export interface FeedbackRow {
  ts: string;
  rawQuery: string;
  spaceId: string | null;
  reason: string;
  note: string | null;
}

export interface Stats {
  persisted: boolean;
  detailAuthorized: boolean;
  /** 서버에 ADMIN_TOKEN 이 설정돼 있는가 — 미설정이면 아무도 원문을 볼 수 없다 */
  tokenConfigured: boolean;
  detailNotice: string | null;
  summary: {
    totalSearches: number;
    successCount: number;
    unmetCount: number;
    unmetRate: number;
    registeredDemands: number;
    contactLeft: number;
    reservationCount: number;
    pendingReservations: number;
    cancelledReservations: number;
    feedbackCount: number;
    avgLatencyMs: number;
  };
  unmetTypes: Counted[];
  regions: Counted[];
  feedbackReasons: Counted[];
  topShownSpaces: Counted[];
  recent: SearchLogRow[];
  demands: DemandRow[];
  reservations: ReservationRow[];
  feedback: FeedbackRow[];
}

export const ADMIN_TOKEN_KEY = 'modi_admin_token';

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
      const res = await fetch('/api/stats', {
        headers: token ? { 'x-admin-token': token } : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '집계를 불러오지 못했습니다.');
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { stats, loading, error, reload };
}
