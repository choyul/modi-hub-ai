/**
 * 계층 ②(퍼지) 발화 점검 — 오타·띄어쓰기가 외부 호출 없이 흡수되는가.
 *   node scripts/probe-fuzzy.mjs [BASE_URL]
 *
 * 각 쌍은 (정확한 이름, 같은 뜻의 오타). 둘 다 ②가 잡아야 정상이다.
 * ③(임베딩)이 받아내면 결과는 맞지만 외부 호출 1회가 발생한다 — 폐쇄망에서 실패.
 */
const BASE = process.argv[2] || 'http://localhost:3000';

const PAIRS = [
  ['키친인큐베이팅', '키친인큐베팅'],   // 글자 누락
  ['그린워크숍룸',   '그린워크샵룸'],   // 숍 → 샵
  ['미디어스튜디오', '미디어스투디오'], // 튜 → 투
  ['춘양목 전시관',  '춘양목 전시간'],  // 관 → 간
  ['송이·약초 체험실', '송이약초체험실'], // 띄어쓰기·기호
];

const tally = {};
let fuzzyHit = 0, total = 0;

for (const [correct, typo] of PAIRS) {
  for (const [kind, q] of [['정확', correct], ['오타', typo]]) {
    const r = await fetch(`${BASE}/api/recommend-spaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    }).then((r) => r.json());

    tally[r.answeredBy] = (tally[r.answeredBy] || 0) + 1;
    total++;
    if (r.answeredBy === 'fuzzy') fuzzyHit++;

    const names = r.matched.map((m) => m.id).join(',') || '없음';
    console.log(
      `  ${(r.answeredBy ?? '?').padEnd(10)} ${kind}  "${q}"  → ${names}`
    );
  }
}

console.log(`\n계층별: ${JSON.stringify(tally)}`);
console.log(`② 퍼지 처리율: ${fuzzyHit}/${total} (${Math.round((fuzzyHit / total) * 100)}%)`);
