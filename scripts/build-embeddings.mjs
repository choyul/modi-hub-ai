/**
 * 임베딩 색인 생성 — SB-04 (런타임 계층 ③의 재료)
 *
 *   node scripts/build-embeddings.mjs
 *
 * 이것이 "AI 는 밤에만 일한다"의 실체다.
 * 여기서 한 번 계산해 두면, 이용 시점에는 외부 호출 없이 벡터 비교만 한다.
 * 비용은 검색 횟수가 아니라 공간 건수에 비례한다 — 시연 ⓒ 의 근거.
 *
 * 주의: gemini-embedding-001 의 기본 출력은 3072 차원이다.
 *       spaces.embedding 이 vector(768) 이므로 outputDimensionality 를 반드시 지정한다.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const DIM = Number(process.env.GEMINI_EMBED_DIM || 768);
const KEY = process.env.GEMINI_API_KEY;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

async function embed(text, taskType) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
        taskType,                        // 문서와 질의를 다른 공간에 두지 않기 위해 명시
        outputDimensionality: DIM,
      }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json.embedding.values;
}

// ── 1. 대상 조회 ────────────────────────────────────────
const { data: spaces, error } = await supabase
  .from('spaces')
  .select('id, name, search_text')
  .order('id');
if (error) throw new Error(error.message);

console.log(`대상 ${spaces.length}건 · 모델 ${MODEL} · ${DIM}차원\n`);

// ── 2. 임베딩 생성 ──────────────────────────────────────
const started = Date.now();
let done = 0;

for (const s of spaces) {
  const vec = await embed(s.search_text, 'RETRIEVAL_DOCUMENT');
  const { error: upErr } = await supabase
    .from('spaces')
    .update({ embedding: vec, updated_at: new Date().toISOString() })
    .eq('id', s.id);
  if (upErr) throw new Error(`${s.id}: ${upErr.message}`);
  done++;
  process.stdout.write(`\r  ${done}/${spaces.length}  ${s.id} ${s.name}`.padEnd(60));
}

const elapsed = (Date.now() - started) / 1000;
console.log(`\n\n✅ ${done}건 완료 · ${elapsed.toFixed(1)}초 (건당 ${(elapsed / done).toFixed(2)}초)`);

// ── 3. 검증 — match_spaces RPC 가 실제로 동작하는가 ──────
const probe = '부녀회 김장 담글 넓은 주방';
const qvec = await embed(probe, 'RETRIEVAL_QUERY');

const { data: matches, error: rpcErr } = await supabase.rpc('match_spaces', {
  query_embedding: qvec,
  match_count: 5,
  min_similarity: 0.3,
});
if (rpcErr) throw new Error(`match_spaces 실패: ${rpcErr.message}`);

console.log(`\n계층 ③ 동작 확인 — "${probe}"`);
for (const m of matches) {
  console.log(`  ${m.similarity.toFixed(3)}  ${m.name}`);
}
console.log('\n※ 이 조회에는 LLM 이 호출되지 않았다. 사전 계산된 벡터 비교만 수행.');
