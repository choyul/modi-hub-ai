/**
 * POST /api/recommend-spaces  { query }
 *
 * 4계층 엔진(SR-10)을 호출하고 3종 로그를 적재한다.
 * NF-05: 인스턴스 메모리에서 IP당 분당 호출을 제한한다.
 *        IP는 카운트에만 쓰고 저장하지 않는다 (LG-03 유지).
 */
import { searchSpaces } from '../server/engine';
import { appendSearchLog, isPersistent } from '../server/db';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();          // 폭주 시 메모리 보호
  return false;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 허용됩니다.' });
  }

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown')
    .split(',')[0].trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ error: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' });
  }

  const query = String(req.body?.query || '').trim();
  if (!query) return res.status(400).json({ error: '검색어가 비어 있습니다.' });
  if (query.length > 300) return res.status(400).json({ error: '검색어가 너무 깁니다. (최대 300자)' });

  const startedAt = Date.now();
  try {
    const result = await searchSpaces(query);
    const latencyMs = Date.now() - startedAt;

    try {
      await appendSearchLog({
        rawQuery: query,
        parsed: {
          purpose: result.parsed.purpose,
          headcount: result.parsed.headcount,
          region: result.parsed.region,
          whenText: result.parsed.whenText,
        },
        outcome: result.matched.length > 0 ? 'success' : 'unmet',
        shownSpaceIds: result.matched.map((m) => m.id),
        unmetType: result.unmetType,
        answeredBy: result.answeredBy,
        llmCalled: result.llmCalled,
        latencyMs,
      });
    } catch (logErr) {
      console.error('검색 로그 적재 실패:', logErr);
    }

    return res.status(200).json({ ...result, latencyMs, persisted: isPersistent });
  } catch (err) {
    console.error('검색 실패:', err);
    return res.status(502).json({ error: '검색에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}
