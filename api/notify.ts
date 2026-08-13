/**
 * POST /api/notify  { spaceId, contact } — 개관 알림 대기 수요 (UD-08)
 *
 * pending 상태 공간에만 열린다. 아직 존재하지 않는 공급에 대한 대기 수요를
 * 연락처와 함께 적재하고, 담당자가 개관 시점(pending→live)에 발송한다 (AD-14).
 */
import { applyCors } from '../server/cors.js';
import { appendNotify, getSpaces, isPersistent } from '../server/db.js';

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 허용됩니다.' });
  }

  const spaceId = String(req.body?.spaceId || '').trim();
  const contact = String(req.body?.contact || '').trim();
  if (!contact || contact.length > 60) {
    return res.status(400).json({ error: '연락받으실 번호나 이메일을 입력해 주세요.' });
  }

  try {
    const space = (await getSpaces()).find((s) => s.id === spaceId);
    if (!space) return res.status(404).json({ error: '존재하지 않는 공간입니다.' });
    if (space.booking_status !== 'pending') {
      return res.status(409).json({ error: '개관 알림은 개관 준비 중인 공간에서만 신청할 수 있습니다.' });
    }
    await appendNotify(spaceId, contact);
    return res.status(200).json({ ok: true, persisted: isPersistent });
  } catch (err) {
    console.error('알림 신청 실패:', err);
    return res.status(500).json({ error: '알림 신청에 실패했습니다.' });
  }
}
