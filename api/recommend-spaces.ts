/**
 * POST /api/recommend-spaces  { query: string }
 *
 * Gemini 호출을 서버에서만 수행한다. API 키는 브라우저로 내려가지 않는다.
 * 응답과 동시에 검색 로그(성공/실패/원문)를 자동 적재한다 — 과제정의서 §3-2.
 */
import { recommendSpaces } from '../server/recommend';
import { appendSearchLog, isPersistent } from '../server/store';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 허용됩니다.' });
  }

  const query = String(req.body?.query || '').trim();
  if (!query) {
    return res.status(400).json({ error: '검색어가 비어 있습니다.' });
  }
  if (query.length > 300) {
    return res.status(400).json({ error: '검색어가 너무 깁니다. (최대 300자)' });
  }

  const startedAt = Date.now();

  try {
    const result = await recommendSpaces(query);
    const latencyMs = Date.now() - startedAt;

    // 로그 적재 실패가 검색 응답을 막지 않도록 격리한다.
    try {
      await appendSearchLog({
        ts: new Date().toISOString(),
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
        latencyMs,
      });
    } catch (logErr) {
      console.error('검색 로그 적재 실패:', logErr);
    }

    return res.status(200).json({ ...result, latencyMs, persisted: isPersistent });
  } catch (err: any) {
    console.error('추천 생성 실패:', err);
    return res
      .status(502)
      .json({ error: 'AI 추천을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}
