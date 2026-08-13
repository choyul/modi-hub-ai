/**
 * 대관 신청 (BK-01~07) — Supabase Auth 세션 필수.
 *
 *   POST   { spaceId, useDate, useTime?, headcount, purpose?, contact? }
 *   GET    본인 신청 목록
 *   DELETE { id } — 승인대기 건만 본인이 취소
 *
 * 채널 가드(BK-08): booking_channel='self' 이고 status='live' 인 공간만 접수한다.
 * 숙박(ota)·미확인(unknown)은 여기로 들어올 수 없다 — 담당자가 처리할 수 없는
 * 신청이 쌓이던 오작동의 수리.
 * 자동 확정 경로는 없다(BK-07) — 상태는 '승인대기'로만 생성된다.
 */
import { applyCors } from '../server/cors.js';
import {
  getSpaces, insertReservation, listReservations, cancelReservation,
  userFromToken, isPersistent,
} from '../server/db.js';

function reservationId(now: Date) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, '');
  return `REV-${d}-${String(now.getTime()).slice(-4)}`;
}

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;
  const user = await userFromToken(req.headers['authorization']);
  if (!user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  try {
    if (req.method === 'GET') {
      const rows = await listReservations(user.id);
      return res.status(200).json({
        reservations: rows.map(mapRow),
        persisted: isPersistent,
      });
    }

    if (req.method === 'DELETE') {
      const id = String(req.body?.id || req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: '취소할 신청을 찾을 수 없습니다.' });
      const result = await cancelReservation(id, user.id);
      if (!result) return res.status(404).json({ error: '해당 신청 내역이 없습니다.' });
      if ('error' in result) return res.status(409).json({ error: result.error });
      return res.status(200).json({ reservation: mapRow(result.reservation) });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST, DELETE');
      return res.status(405).json({ error: 'GET, POST, DELETE만 허용됩니다.' });
    }

    const spaceId = String(req.body?.spaceId || '').trim();
    const useDate = String(req.body?.useDate || '').trim();
    const headcount = Number(req.body?.headcount);

    const space = (await getSpaces()).find((s) => s.id === spaceId);
    if (!space) return res.status(400).json({ error: '존재하지 않는 공간입니다.' });

    // 채널 가드 (BK-08)
    if (space.booking_channel === 'ota') {
      return res.status(409).json({
        error: `${space.name}은(는) 외부 예약 공간입니다. ${
          space.booking_status === 'pending'
            ? `개관(${space.open_from ?? '미정'}) 후 ${space.planned_channels.join('·')}에서 예약하실 수 있습니다.`
            : '예약 사이트에서 진행해 주세요.'
        }`,
      });
    }
    if (space.booking_channel !== 'self' || space.reservation_method == null || space.capacity_max == null) {
      return res.status(409).json({
        error: `${space.name}은(는) ${space.owner_dept ?? '소관 부서'} 소관으로, 이용 조건과 신청 절차가 아직 확인되지 않아 온라인 신청을 받을 수 없습니다.`,
      });
    }

    if (!useDate) return res.status(400).json({ error: '이용 희망일을 입력해 주세요.' });
    if (!Number.isFinite(headcount) || headcount < 1) {
      return res.status(400).json({ error: '이용 인원을 입력해 주세요.' });
    }
    if (headcount > space.capacity_max) {
      return res.status(400).json({
        error: `${space.name}의 최대 수용 인원은 ${space.capacity_max}명입니다.`,
      });
    }

    const now = new Date();
    const row = {
      id: reservationId(now),
      userId: user.id,
      spaceId,
      applicant: String(req.body?.applicant || '').trim() || user.email?.split('@')[0] || '신청자',
      useDate,
      useTime: String(req.body?.useTime || '').trim() || null,
      headcount,
      purpose: String(req.body?.purpose || '').trim().slice(0, 200) || null,
      contact: String(req.body?.contact || '').trim() || null,
    };
    await insertReservation(row);
    return res.status(200).json({
      reservation: { ...mapRow({ ...row, use_date: row.useDate, use_time: row.useTime, space_id: spaceId, created_at: now.toISOString(), status: '승인대기' }) },
      persisted: isPersistent,
    });
  } catch (err) {
    console.error('예약 처리 실패:', err);
    return res.status(500).json({ error: '처리에 실패했습니다.' });
  }
}

/** DB snake_case → 화면 camelCase (기존 화면 계약 유지) */
function mapRow(r: any) {
  return {
    id: r.id,
    ts: r.created_at,
    spaceId: r.space_id,
    applicant: r.applicant,
    useDate: r.use_date,
    useTime: r.use_time ?? '시간 미정',
    headcount: r.headcount,
    purpose: r.purpose ?? '기재 없음',
    status: r.status,
  };
}
