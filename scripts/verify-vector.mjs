/**
 * 계층 ③(임베딩 검색) 동작 확인.
 *   node scripts/verify-vector.mjs
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const MODEL = process.env.GEMINI_EMBED_MODEL;
const DIM = Number(process.env.GEMINI_EMBED_DIM);

async function embed(text, taskType) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: DIM,
      }),
    }
  );
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message);
  return j.embedding.values;
}

// 임베딩이 실제로 저장됐는지부터
const { count: total } = await supabase.from('spaces').select('*', { count: 'exact', head: true });
const { count: withVec } = await supabase
  .from('spaces').select('*', { count: 'exact', head: true }).not('embedding', 'is', null);
console.log(`저장된 임베딩: ${withVec}/${total}건`);

const QUERIES = [
  '부녀회 김장 담글 넓은 주방',
  '조용히 책 읽을 곳',
  '송이철에 가족이 묵을 곳',
];

/** 캐시 반영이 몇 초 걸릴 수 있어 최대 3회 재시도 */
async function rpcWithRetry(args) {
  for (let i = 0; i < 3; i++) {
    const r = await supabase.rpc('match_spaces', args);
    if (!r.error || !r.error.message.includes('schema cache')) return r;
    if (i < 2) await new Promise((res) => setTimeout(res, 4000));
  }
  return supabase.rpc('match_spaces', args);
}

for (const q of QUERIES) {
  const qvec = await embed(q, 'RETRIEVAL_QUERY');
  const { data, error } = await rpcWithRetry({
    query_embedding: qvec,
    match_count: 3,
    min_similarity: 0.3,
  });
  if (error) {
    console.error(`\n❌ match_spaces 실패: ${error.message}`);
    console.error('\n→ Supabase SQL Editor 에서 아래 한 줄을 실행한 뒤 다시 시도하세요:');
    console.error("     notify pgrst, 'reload schema';");
    process.exit(1);
  }
  console.log(`\n"${q}"`);
  for (const m of data) console.log(`   ${m.similarity.toFixed(3)}  ${m.name}`);
}
console.log('\n※ LLM 호출 0회 — 사전 계산된 벡터 비교만 수행했습니다.');
