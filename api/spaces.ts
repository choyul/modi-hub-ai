/**
 * GET /api/spaces — 공개 공간 목록.
 *
 * 공간 정보는 누구나 보는 정보이므로 인증을 걸지 않는다. 봉화사이로(주민 대면
 * 화면)가 이 API 를 정본으로 삼아 목록을 그린다 — 담당자가 MODI Hub 에서
 * 값을 고치면 그쪽 화면에도 그대로 반영된다. 데이터를 두 벌로 두면 반드시
 * 어긋나므로, 출처를 하나로 둔다.
 *
 * 사진은 「올린 사진이 있으면 그 주소, 없으면 null」로 내려보낸다. 받는 쪽이
 * 없을 때 무엇을 보여줄지(용도별 예시 사진) 스스로 정하게 두는 편이 낫다.
 */
import { applyCors } from '../server/cors.js';
import { getSpaces } from '../server/db.js';
import { supabaseAdmin } from '../server/supabase.js';

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET만 허용됩니다.' });
  }

  try {
    const spaces = await getSpaces();

    // 담당자가 올린 실제 사진 목록 (파일 존재가 곧 상태)
    const photos: Record<string, string> = {};
    try {
      const sb = supabaseAdmin();
      const { data: files } = await sb.storage.from('space-photos').list();
      for (const f of files ?? []) {
        const { data: pub } = sb.storage.from('space-photos').getPublicUrl(f.name);
        const v = f.updated_at ? new Date(f.updated_at).getTime() : 0;
        photos[f.name.replace(/\.jpg$/i, '')] = v ? `${pub.publicUrl}?v=${v}` : pub.publicUrl;
      }
    } catch {
      // 사진 목록을 못 읽어도 공간 목록은 내려가야 한다
    }

    return res.status(200).json({
      spaces: spaces.map((s: any) => ({
        id: s.id,
        sigungu: s.sigungu,
        facility: s.facility,
        name: s.name,
        category: s.category,
        floor: s.floor,
        location: s.location,
        areaSqm: s.area_sqm,
        capacityMin: s.capacity_min,
        capacityMax: s.capacity_max,
        feePerHour: s.fee_per_hour,
        feePerNight: s.fee_per_night,
        features: s.features ?? [],
        specialty: s.specialty,
        reservationLeadDays: s.reservation_lead_days,
        ownerDept: s.owner_dept,
        reservationMethod: s.reservation_method,
        contact: s.contact,
        bookingChannel: s.booking_channel,
        bookingStatus: s.booking_status,
        plannedChannels: s.planned_channels ?? [],
        openFrom: s.open_from,
        photoUrl: photos[s.id] ?? null,
      })),
      count: spaces.length,
    });
  } catch (err) {
    console.error('공간 목록 조회 실패:', err);
    return res.status(500).json({ error: '공간 정보를 불러오지 못했습니다.' });
  }
}
