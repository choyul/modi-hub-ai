/**
 * POST /api/reservation  — 대관 신청 접수
 * GET  /api/reservation?applicant=이름 — 신청자별 조회
 *
 * 범위: 신청 접수와 승인 대기까지. 실시간 확정·결제·외부 예약시스템 연동은 하지 않는다.
 * 승인 권한은 담당자에게 있고, 이 API는 어떤 경우에도 상태를 '예약확정'으로 만들지 않는다.
 *
 * 신청(성공 수요)과 미충족 수요(실패)를 같은 저장소에 남겨야
 * 담당자가 "무엇이 쓰였고 무엇이 없었는가"를 한 화면에서 볼 수 있다.
 */
import { appendReservation, readReservations, isPersistent } from '../server/store';
import spacesData from '../src/data/spaces.json';

const VALID_IDS = new Set(spacesData.spaces.map((s: any) => s.id));

function makeId(ts: Date, seq: string) {
  const d = ts.toISOString().slice(2, 10).replace(/-/g, '');
  return `REV-${d}-${seq}`;
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const all = await readReservations(200);
      const applicant = String(req.query?.applicant || '').trim();
      const list = applicant ? all.filter((r) => r.applicant === applicant) : all;
      return res.status(200).json({ reservations: list, persisted: isPersistent });
    } catch (err) {
      console.error('예약 조회 실패:', err);
      return res.status(500).json({ error: '예약 내역을 불러오지 못했습니다.' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'GET 또는 POST만 허용됩니다.' });
  }

  const b = req.body || {};
  const spaceId = String(b.spaceId || '').trim();
  const applicant = String(b.applicant || '').trim();
  const useDate = String(b.useDate || '').trim();
  const headcount = Number(b.headcount);

  if (!VALID_IDS.has(spaceId)) {
    return res.status(400).json({ error: '존재하지 않는 공간입니다.' });
  }
  if (!applicant) return res.status(400).json({ error: '신청자를 확인할 수 없습니다.' });
  if (!useDate) return res.status(400).json({ error: '이용 희망일을 입력해 주세요.' });
  if (!Number.isFinite(headcount) || headcount < 1) {
    return res.status(400).json({ error: '이용 인원을 입력해 주세요.' });
  }

  // 수용 인원 초과는 접수 단계에서 거른다 — 담당자가 반려하러 들어오는 일을 줄인다
  const space: any = spacesData.spaces.find((s: any) => s.id === spaceId);
  if (headcount > space.capacity_max) {
    return res.status(400).json({
      error: `${space.name}의 최대 수용 인원은 ${space.capacity_max}명입니다.`,
    });
  }

  const now = new Date();
  const reservation = {
    id: makeId(now, String(now.getTime()).slice(-4)),
    ts: now.toISOString(),
    spaceId,
    applicant,
    useDate,
    useTime: String(b.useTime || '').trim() || '시간 미정',
    headcount,
    purpose: String(b.purpose || '').trim().slice(0, 200) || '기재 없음',
    contact: String(b.contact || '').trim() || null,
    status: '승인대기' as const,
  };

  try {
    await appendReservation(reservation);
    return res.status(200).json({ reservation, persisted: isPersistent });
  } catch (err) {
    console.error('예약 접수 실패:', err);
    return res.status(500).json({ error: '신청 접수에 실패했습니다.' });
  }
}
