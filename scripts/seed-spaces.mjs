/**
 * 공간 데이터 시딩 — spaces.json 31건 → Supabase spaces 테이블
 *
 *   node scripts/seed-spaces.mjs
 *
 * 이 스크립트가 하는 일
 *  1) 예약 채널 판정 (BK-08·10) — 숙박은 ota/pending, 값 미확인 공간은 unknown
 *  2) 신뢰 등급 매핑 (SP-10)
 *  3) 퍼지·임베딩 대상 통합 문자열 search_text 생성
 *  4) upsert — 여러 번 돌려도 안전
 *
 * 없는 값을 채우지 않는다. null 은 null 로 넣는다.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

const data = JSON.parse(readFileSync('src/data/spaces.json', 'utf8'));

/** 숙박은 운영주체가 OTA 로 판매한다. 준공(2026.12) 전이라 아직 등록 전 */
const OTA_CHANNELS = ['야놀자', '여기어때', '에어비앤비'];

function bookingOf(s) {
  if (s.category === '숙박') {
    return {
      booking_channel: 'ota',
      booking_status: 'pending',        // 개관 후 live 로 전환 (AD-14)
      booking_links: [],                // 등록 전이므로 비움. 지어내지 않는다
      planned_channels: OTA_CHANNELS,
      open_from: '2026-12-01',
    };
  }
  // 이용 조건·절차가 확인되지 않은 공간 — 신청을 열지 않는다 (BK-04)
  if (s.capacity_max == null || s.reservation_method == null) {
    return {
      booking_channel: 'unknown',
      booking_status: 'unknown',
      booking_links: [],
      planned_channels: [],
      open_from: null,
    };
  }
  return {
    booking_channel: 'self',
    booking_status: 'live',
    booking_links: [],
    planned_channels: [],
    open_from: null,
  };
}

/** 퍼지(Fuse.js)와 임베딩이 함께 쓰는 검색 대상 문자열 */
function searchTextOf(s) {
  return [
    s.name, s.facility, s.category, s.specialty,
    ...(s.features || []),
    s.sigungu, s.owner_dept,
  ].filter(Boolean).join(' ');
}

const rows = data.spaces.map((s) => ({
  id: s.id,
  sigungu: s.sigungu ?? '봉화군',
  facility: s.facility,
  name: s.name,
  category: s.category,
  floor: s.floor ?? null,
  location: s.location ?? null,
  area_sqm: s.area_sqm ?? null,

  capacity_min: s.capacity_min ?? null,
  capacity_max: s.capacity_max ?? null,
  fee_per_hour: s.fee_per_hour ?? null,
  fee_per_night: s.fee_per_night ?? null,
  features: s.features ?? [],
  specialty: s.specialty ?? null,
  reservation_lead_days: s.reservation_lead_days ?? null,

  owner_dept: s.owner_dept ?? null,
  reservation_method: s.reservation_method ?? null,
  contact: s.contact ?? null,

  ...bookingOf(s),

  source: s.source ?? null,
  as_of: s.as_of ?? null,
  verified: s.verified ?? false,
  trust_level: s.verified ? 'confirmed' : 'unverified',

  search_text: searchTextOf(s),
  aliases: [],
}));

const { error } = await supabase.from('spaces').upsert(rows, { onConflict: 'id' });
if (error) {
  console.error('시딩 실패:', error.message);
  process.exit(1);
}

// ── 확인 ────────────────────────────────────────────────
const { count } = await supabase
  .from('spaces')
  .select('*', { count: 'exact', head: true });

const { data: byChannel } = await supabase
  .from('spaces')
  .select('id, name, booking_channel, booking_status')
  .neq('booking_channel', 'self')
  .order('id');

console.log(`✅ ${rows.length}건 반영 · 테이블 총 ${count}건`);
console.log('\nself 가 아닌 공간 (채널 분기 확인):');
for (const s of byChannel ?? []) {
  console.log(`  ${s.id}  ${s.name.padEnd(18)} ${s.booking_channel}/${s.booking_status}`);
}
