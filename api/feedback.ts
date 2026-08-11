/**
 * POST /api/feedback — 이탈 사유(UD-05) + 정보 오류 신고(PL-14, reason='report')
 */
import { appendFeedback, isPersistent } from '../server/db';

const REASONS = ['far', 'time', 'cost', 'type', 'other', 'report'];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 허용됩니다.' });
  }

  const rawQuery = String(req.body?.rawQuery || '').trim();
  const reason = String(req.body?.reason || '').trim();

  if (!rawQuery) return res.status(400).json({ error: '내용이 없습니다.' });
  if (!REASONS.includes(reason)) return res.status(400).json({ error: '알 수 없는 사유입니다.' });

  try {
    // DB 제약은 5종만 허용한다. 오류 신고는 'other'로 넣되 note 에 표식을 남긴다.
    const isReport = reason === 'report';
    const note = String(req.body?.note || '').trim().slice(0, 300);
    await appendFeedback({
      rawQuery,
      spaceId: req.body?.spaceId ? String(req.body.spaceId) : null,
      reason: isReport ? 'other' : reason,
      note: isReport ? `[정보오류] ${note}`.trim() : note || null,
    });
    return res.status(200).json({ ok: true, persisted: isPersistent });
  } catch (err) {
    console.error('피드백 적재 실패:', err);
    return res.status(500).json({ error: '저장에 실패했습니다.' });
  }
}
