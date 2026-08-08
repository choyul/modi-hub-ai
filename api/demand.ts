/**
 * POST /api/demand  { rawQuery, unmetType, contact?, note? }
 *
 * 실패 3겹 응답 ②③ — 사용자가 "이 수요를 봉화군에 전달할까요?"에 직접 동의했을 때만 호출된다.
 * 몰래 수집하는 로그가 아니라, 사용자가 자기 수요를 행정에 등록하는 경로다.
 * 연락처는 선택 입력이며, 입력하지 않아도 수요 등록 자체는 성립한다.
 */
import { appendDemand, isPersistent } from '../server/store';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 허용됩니다.' });
  }

  const rawQuery = String(req.body?.rawQuery || '').trim();
  if (!rawQuery) {
    return res.status(400).json({ error: '등록할 수요 내용이 없습니다.' });
  }

  const contact = String(req.body?.contact || '').trim();
  if (contact && contact.length > 60) {
    return res.status(400).json({ error: '연락처가 너무 깁니다.' });
  }

  try {
    await appendDemand({
      ts: new Date().toISOString(),
      rawQuery,
      unmetType: req.body?.unmetType ?? null,
      consented: true,
      contact: contact || null,
      note: String(req.body?.note || '').trim().slice(0, 500) || null,
    });
    return res.status(200).json({ ok: true, persisted: isPersistent });
  } catch (err) {
    console.error('수요 등록 실패:', err);
    return res.status(500).json({ error: '수요 등록에 실패했습니다.' });
  }
}
