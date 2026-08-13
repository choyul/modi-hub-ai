/**
 * 응대 로그 정리 — 백업 → 테스트 흔적 제거 → 미충족 유형 재분류
 *
 *   npx tsx scripts/reclassify-logs.mts          미리보기 (아무것도 바꾸지 않음)
 *   npx tsx scripts/reclassify-logs.mts --apply  실제 반영
 *
 * 왜 필요한가
 *   1) QA 스위트가 만든 「레이트리밋 검증」 같은 행이 실제 주민 질의를 덮는다.
 *      묶어보기 1위가 테스트 문자열이면 그 화면은 아무것도 알려주지 못한다.
 *   2) 「수영장 빌릴 수 있나요」가 「분류 미상」으로 쌓여 있다. 못 알아들은 게
 *      아니라 없는 것이다. 이 둘이 한 칸에 섞이면 어느 쪽도 근거가 못 된다.
 *
 * 재분류는 손으로 문자열을 맞추지 않고 운영 중인 분류기(cheapParse)를 그대로
 * 돌린다. 화면과 다른 기준으로 과거를 고쳐 쓰면 통계가 두 개가 된다.
 *
 * 지우기 전에 전량을 CSV 로 남긴다. 되돌릴 수 없는 작업은 되돌릴 수 있게 해 두고 한다.
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';
import { cheapParse } from '../server/parse.js';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');

/** QA 스위트·워밍업이 만든 행. 정확히 일치하는 것만 지운다 — 부분 일치는 실주민 질의를 삼킨다 */
const TEST_QUERIES = ['레이트리밋 검증', '워밍업', '워밍업2', 'QA검색어확인'];

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});

const { data: logs, error } = await sb.from('search_logs').select('*').order('ts');
if (error) { console.error('읽기 실패:', error.message); process.exit(1); }
const rows = logs ?? [];
console.log(`전체 ${rows.length}건\n`);

// ── 0) 백업 ──────────────────────────────────────────────────
const cols = Object.keys(rows[0] ?? {});
const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = '﻿' + [
  cols.map(esc).join(','),
  ...rows.map((r: any) => cols.map((c) => esc(typeof r[c] === 'object' ? JSON.stringify(r[c]) : r[c])).join(',')),
].join('\r\n');
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const backup = `search_logs_backup_${stamp}.csv`;
writeFileSync(backup, csv);
console.log(`백업 저장: ${backup} (${rows.length}행)\n`);

// ── 1) 테스트 흔적 ───────────────────────────────────────────
const junk = rows.filter((r: any) => TEST_QUERIES.includes(r.raw_query));
console.log(`── 삭제 대상 ${junk.length}건 ──`);
for (const q of TEST_QUERIES) {
  const n = junk.filter((r: any) => r.raw_query === q).length;
  if (n) console.log(`  ${String(n).padStart(4)}  ${q}`);
}

// ── 2) 재분류 ────────────────────────────────────────────────
const junkIds = new Set(junk.map((r: any) => r.id));
const targets = rows
  .filter((r: any) => !junkIds.has(r.id) && r.outcome === 'unmet')
  .map((r: any) => ({ row: r, facility: cheapParse(r.raw_query ?? '').facility }))
  .filter((x) => x.facility && x.row.unmet_type !== `미보유 시설 · ${x.facility}`);

console.log(`\n── 재분류 대상 ${targets.length}건 ──`);
const grouped = new Map<string, number>();
for (const t of targets) {
  const k = `${t.row.unmet_type ?? '(없음)'}  →  미보유 시설 · ${t.facility}`;
  grouped.set(k, (grouped.get(k) ?? 0) + 1);
}
for (const [k, n] of [...grouped.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${k}`);
}

if (!APPLY) {
  console.log('\n미리보기입니다. 실제로 반영하려면 --apply 를 붙이세요.');
  process.exit(0);
}

// ── 반영 ─────────────────────────────────────────────────────
if (junk.length) {
  const { error: dErr } = await sb.from('search_logs').delete().in('raw_query', TEST_QUERIES);
  if (dErr) { console.error('\n삭제 실패:', dErr.message); process.exit(1); }
  console.log(`\n삭제 완료 ${junk.length}건`);
}

let done = 0;
for (const t of targets) {
  const { error: uErr } = await sb
    .from('search_logs')
    .update({ unmet_type: `미보유 시설 · ${t.facility}` })
    .eq('id', t.row.id);
  if (uErr) console.warn(`  갱신 실패 id=${t.row.id}: ${uErr.message}`);
  else done += 1;
}
console.log(`재분류 완료 ${done}/${targets.length}건`);

const { count } = await sb.from('search_logs').select('*', { count: 'exact', head: true });
console.log(`\n남은 로그 ${count}건 · 백업 ${backup}`);
