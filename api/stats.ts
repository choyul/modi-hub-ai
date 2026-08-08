/**
 * GET /api/stats
 *
 * 담당자 화면(미충족 수요)의 데이터 원천. 하드코딩 상수가 아니라
 * 실제 적재된 검색 로그를 그 자리에서 집계한다.
 *
 * 원문 질의·연락처가 포함된 상세 목록은 ADMIN_TOKEN 헤더가 맞을 때만 내려간다.
 * 토큰이 서버에 설정돼 있지 않으면 집계값만 공개하고, 그 사실을 응답에 명시한다.
 */
import { readSearchLogs, readDemands, isPersistent } from '../server/store';

function countBy<T>(items: T[], key: (t: T) => string | null) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET만 허용됩니다.' });
  }

  try {
    const [logs, demands] = await Promise.all([readSearchLogs(500), readDemands(500)]);

    const unmetLogs = logs.filter((l) => l.outcome === 'unmet');
    const adminToken = process.env.ADMIN_TOKEN;
    const authorized = Boolean(adminToken) && req.headers['x-admin-token'] === adminToken;

    return res.status(200).json({
      // 저장소 상태를 숨기지 않는다 — 메모리 폴백이면 화면에 그대로 표시된다
      persisted: isPersistent,
      detailAuthorized: authorized,
      detailNotice: adminToken
        ? null
        : 'ADMIN_TOKEN이 설정되지 않아 원문 질의 목록은 내려보내지 않습니다.',
      summary: {
        totalSearches: logs.length,
        successCount: logs.length - unmetLogs.length,
        unmetCount: unmetLogs.length,
        unmetRate: logs.length ? Math.round((unmetLogs.length / logs.length) * 100) : 0,
        registeredDemands: demands.length,
        contactLeft: demands.filter((d) => d.contact).length,
        avgLatencyMs: logs.length
          ? Math.round(logs.reduce((a, l) => a + (l.latencyMs || 0), 0) / logs.length)
          : 0,
      },
      // 없는 시설 유형 집계 — 성공기준 §6 "실패 로그에서 없는 시설 유형이 집계되는가"
      unmetTypes: countBy(unmetLogs, (l) => l.unmetType),
      regions: countBy(logs, (l) => l.parsed?.region),
      topShownSpaces: countBy(
        logs.flatMap((l) => l.shownSpaceIds.map((id) => ({ id }))),
        (s) => s.id
      ),
      recent: authorized
        ? logs.slice(0, 50)
        : logs.slice(0, 50).map((l) => ({ ...l, rawQuery: '[비공개]' })),
      demands: authorized ? demands.slice(0, 50) : [],
    });
  } catch (err) {
    console.error('집계 실패:', err);
    return res.status(500).json({ error: '집계를 불러오지 못했습니다.' });
  }
}
