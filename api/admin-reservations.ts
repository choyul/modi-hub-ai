/**
 * 대관 신청 관리 — 관리자.
 *
 *   GET   목록 (상태·공간·기간으로 좁힌다)
 *   PATCH { id, status, memo? }  승인 · 반려 · 되돌리기
 *
 * 상태는 넷뿐이다: 승인대기 → 예약확정 / 반려, 그리고 신청자가 스스로 한 취소.
 * 신청자가 취소한 건은 담당자가 되살리지 않는다 — 본인이 물린 것을 남이
 * 되돌리면 그건 다른 사람의 예약이 된다.
 *
 * 반려에는 사유를 요구한다. 이유 없는 거절은 민원이 되고, 담당자도 나중에
 * 왜 그랬는지 기억하지 못한다.
 */
import { applyCors } from '../server/cors.js';
import { supabaseAdmin } from '../server/supabase.js';
import { getSpaces } from '../server/db.js';
import { requireAdmin, logAction, deny } from '../server/adminAuth.js';

const NEXT: Record<string, string[]> = {
  승인대기: ['예약확정', '반려'],
  예약확정: ['반려'],       // 확정 후에도 사정이 생기면 되돌릴 수 있어야 한다
  반려: ['예약확정'],       // 잘못 반려했으면 되살린다
  취소: [],                 // 신청자 몫
};

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  const me = await requireAdmin(req, 'admin');
  if (!me) return deny(res);

  const sb = supabaseAdmin();

  try {
    if (req.method === 'GET') {
      const status = String(req.query?.status ?? '').trim();
      const spaceId = String(req.query?.spaceId ?? '').trim();
      const from = String(req.query?.from ?? '').trim();
      const to = String(req.query?.to ?? '').trim();

      let q = sb.from('reservations').select('*').order('created_at', { ascending: false }).limit(300);
      if (status) q = q.eq('status', status);
      if (spaceId) q = q.eq('space_id', spaceId);
      if (from) q = q.gte('use_date', from);
      if (to) q = q.lte('use_date', to);

      const { data, error } = await q;
      if (error) throw new Error(error.message);

      const spaces = await getSpaces();
      const nameOf = (id: string) => spaces.find((s: any) => s.id === id)?.name ?? id;

      const rows = (data ?? []).map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        spaceId: r.space_id,
        spaceName: nameOf(r.space_id),
        applicant: r.applicant,
        contact: r.contact,
        useDate: r.use_date,
        useTime: r.use_time,
        headcount: r.headcount,
        purpose: r.purpose,
        status: r.status,
        canMoveTo: NEXT[r.status] ?? [],
      }));

      // 화면 상단에 걸 숫자 — 담당자가 가장 먼저 보는 것은 '내가 처리할 게 몇 건인가'
      const all = await sb.from('reservations').select('status');
      const counts = { 승인대기: 0, 예약확정: 0, 반려: 0, 취소: 0 } as Record<string, number>;
      for (const r of all.data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;

      return res.status(200).json({ reservations: rows, counts, me: { role: me.role } });
    }

    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'GET, PATCH');
      return res.status(405).json({ error: 'GET, PATCH만 허용됩니다.' });
    }

    const id = String(req.body?.id ?? '').trim();
    const status = String(req.body?.status ?? '').trim();
    const memo = String(req.body?.memo ?? '').trim();
    if (!id) return res.status(400).json({ error: '신청 건을 지정해 주세요.' });

    const { data: before, error: fErr } = await sb
      .from('reservations').select('*').eq('id', id).maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!before) return res.status(404).json({ error: '해당 신청이 없습니다.' });

    const allowed = NEXT[before.status] ?? [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error:
          before.status === '취소'
            ? '신청자가 취소한 건입니다. 담당자가 되살릴 수 없습니다.'
            : `「${before.status}」에서 「${status}」로는 바꿀 수 없습니다. 가능한 상태: ${allowed.join(', ') || '없음'}`,
      });
    }
    if (status === '반려' && !memo) {
      return res.status(400).json({ error: '반려 사유를 적어 주세요. 신청자에게 전달됩니다.' });
    }

    const { data: after, error } = await sb
      .from('reservations').update({ status }).eq('id', id).select('*').maybeSingle();
    if (error) throw new Error(error.message);

    await logAction(me, `reservation.${status}`, id, {
      from: before.status, to: status, memo: memo || null, spaceId: before.space_id,
    });

    return res.status(200).json({
      reservation: { id: after.id, status: after.status, canMoveTo: NEXT[after.status] ?? [] },
    });
  } catch (err) {
    console.error('대관 신청 처리 실패:', err);
    return res.status(500).json({ error: '처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}
