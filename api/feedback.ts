/**
 * POST /api/feedback  { rawQuery, spaceId?, reason, note? }
 *
 * "이 추천이 맞지 않아요" 신호를 받는다 (HAX G15·G17).
 * 부정 피드백을 받을 곳이 없으면 사용자는 조용히 떠나고, 담당자는 이유를 모른다.
 * 성공 검색인데도 이탈하는 지점을 잡는 것이 목적이므로 미충족 수요와 별도로 적재한다.
 */
import { appendFeedback, isPersistent } from '../server/store';

const REASONS = ['far', 'time', 'cost', 'type', 'other'];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 허용됩니다.' });
  }

  const rawQuery = String(req.body?.rawQuery || '').trim();
  const reason = String(req.body?.reason || '').trim();

  if (!rawQuery) return res.status(400).json({ error: '검색어가 없습니다.' });
  if (!REASONS.includes(reason)) {
    return res.status(400).json({ error: '알 수 없는 사유입니다.' });
  }

  try {
    await appendFeedback({
      ts: new Date().toISOString(),
      rawQuery,
      spaceId: req.body?.spaceId ? String(req.body.spaceId) : null,
      reason,
      note: String(req.body?.note || '').trim().slice(0, 300) || null,
    });
    return res.status(200).json({ ok: true, persisted: isPersistent });
  } catch (err) {
    console.error('피드백 적재 실패:', err);
    return res.status(500).json({ error: '피드백 저장에 실패했습니다.' });
  }
}
