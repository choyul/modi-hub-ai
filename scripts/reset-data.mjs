/**
 * 데이터 리셋 — 테스트 로그 전량 삭제 + 공간 테이블을 계획서 실데이터로 교체.
 *   node scripts/reset-data.mjs
 *
 * 1) 테스트 데이터 삭제: search_logs · demands · feedbacks · reservations · notify_requests
 * 2) 기존 공간(가공 데이터) 삭제 → spaces.json(실데이터)로 재삽입
 * 3) 임베딩은 build-embeddings.mjs 로 별도 재계산
 *
 * 실행 후 담당자 화면은 "0건" 상태로 시작한다(정직한 초기값). 실제 지표는
 * 사용자가 준비할 테스트 시나리오로 채워진다.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

// ── 1) 테스트 데이터 삭제 (FK 순서: 자식 → 공간) ───────────
const wipe = ['reservations', 'notify_requests', 'feedbacks', 'demands', 'search_logs'];
for (const table of wipe) {
  const { error, count } = await sb.from(table).delete({ count: 'exact' }).gte('ts', '1900-01-01')
    .then((r) => r, () => ({ error: 'ts 없음' }));
  // ts 컬럼이 없는 테이블(reservations: created_at) 대비 — id 로 재시도
  if (error) {
    const { count: c2, error: e2 } = await sb.from(table).delete({ count: 'exact' }).neq('id', '');
    if (e2) { console.error(`  ✗ ${table}: ${e2.message}`); continue; }
    console.log(`  🗑  ${table}: ${c2 ?? 0}건 삭제`);
  } else {
    console.log(`  🗑  ${table}: ${count ?? 0}건 삭제`);
  }
}

// ── 2) 공간 교체 ──────────────────────────────────────────
const { error: delErr } = await sb.from('spaces').delete().neq('id', '');
if (delErr) { console.error('공간 삭제 실패:', delErr.message); process.exit(1); }
console.log('  🗑  spaces: 기존 전량 삭제');

const data = JSON.parse(readFileSync('src/data/spaces.json', 'utf8'));

function searchText(s) {
  return [s.name, s.facility, s.category, s.specialty, ...(s.features || []), s.sigungu, s.owner_dept]
    .filter(Boolean).join(' ');
}

const rows = data.spaces.map((s) => ({
  id: s.id, sigungu: s.sigungu ?? '봉화군', facility: s.facility, name: s.name,
  category: s.category, floor: s.floor ?? null, location: s.location ?? null,
  area_sqm: s.area_sqm ?? null,
  capacity_min: s.capacity_min ?? null, capacity_max: s.capacity_max ?? null,
  fee_per_hour: s.fee_per_hour ?? null, fee_per_night: s.fee_per_night ?? null,
  features: s.features ?? [], specialty: s.specialty ?? null,
  reservation_lead_days: s.reservation_lead_days ?? null,
  owner_dept: s.owner_dept ?? null, reservation_method: s.reservation_method ?? null,
  contact: s.contact ?? null,
  // 채널은 spaces.json 의 명시값을 그대로 신뢰한다 (계획서 기준으로 사람이 판정)
  booking_channel: s.booking_channel ?? 'unknown',
  booking_status: s.booking_status ?? 'unknown',
  booking_links: s.booking_links ?? [],
  planned_channels: s.planned_channels ?? [],
  open_from: s.open_from ?? null,
  source: s.source ?? null, as_of: s.as_of ?? null,
  verified: s.verified ?? false, trust_level: s.trust_level ?? 'unverified',
  search_text: searchText(s), aliases: [],
}));

const { error: insErr } = await sb.from('spaces').insert(rows);
if (insErr) { console.error('공간 삽입 실패:', insErr.message); process.exit(1); }

const { count } = await sb.from('spaces').select('*', { count: 'exact', head: true });
console.log(`\n✅ 공간 ${rows.length}건 삽입 · 테이블 총 ${count}건`);

const { data: byChannel } = await sb.from('spaces')
  .select('id, name, booking_channel, booking_status').order('id');
console.log('\n채널 분포:');
for (const s of byChannel ?? []) {
  console.log(`  ${s.id.padEnd(5)} ${s.name.padEnd(18)} ${s.booking_channel}/${s.booking_status}`);
}
console.log('\n다음: node scripts/build-embeddings.mjs 로 임베딩 재계산');
