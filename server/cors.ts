/**
 * 교차 출처 허용 (CORS).
 *
 * MODI Hub 는 이제 자기 화면에만 답하지 않는다. 검증을 끝낸 검색·예약 기능을
 * 주민 대면 서비스(봉화사이로)가 그대로 가져다 쓰기 때문에, 다른 도메인에서
 * 오는 호출을 받아야 한다.
 *
 * 다만 아무 데나 열지 않는다 — 허용 목록에 있는 출처에만 응답 헤더를 붙인다.
 * '*' 로 열면 담당자 토큰·세션 토큰이 실린 요청을 아무 사이트나 대신 보낼 수
 * 있게 되므로, 출처를 하나씩 적는다.
 */
const ALLOWED = [
  'https://bonghwa-connect.lovable.app',
  'https://modi-hub-ai.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

/** 미리보기 배포처럼 매번 주소가 바뀌는 경우까지 받아 준다 */
function isAllowed(origin: string): boolean {
  if (ALLOWED.includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)
    || /^https:\/\/[a-z0-9-]+-choyuls-projects\.vercel\.app$/.test(origin);
}

/**
 * 응답에 CORS 헤더를 붙이고, 사전요청(OPTIONS)이면 여기서 끝낸다.
 * @returns true 면 이미 응답을 마쳤으니 호출부는 즉시 return 해야 한다.
 */
export function applyCors(req: any, res: any): boolean {
  const origin = String(req.headers?.origin ?? '');

  // Vary 는 출처를 따지기 '전에', 모든 응답에 붙인다.
  //
  // 허용된 출처에만 붙였더니 실제로 이런 일이 났다: Origin 없이 들어온 요청
  // (curl·크롤러)의 응답 — CORS 헤더가 없는 응답 — 이 CDN 에 캐시되고, 그 뒤
  // 브라우저가 같은 주소를 부르면 그 캐시본을 받아 "Failed to fetch" 로 막혔다.
  // 응답이 Origin 에 따라 달라진다는 사실을 캐시에 항상 알려야 한다.
  res.setHeader('Vary', 'Origin');
  // API 응답은 사람마다·시점마다 다르다. 중간 캐시가 남기지 않게 한다.
  res.setHeader('Cache-Control', 'no-store');

  if (origin && isAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-admin-token'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
