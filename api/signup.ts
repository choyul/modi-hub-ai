/**
 * 회원가입 (AU-01) — 서버에서 계정을 만들고 바로 쓸 수 있게 한다.
 *
 * 왜 브라우저의 supabase.auth.signUp 을 그대로 쓰지 않는가
 *   Supabase 기본 설정은 「이메일 확인」이 켜져 있어, 가입은 되지만 확인 메일의
 *   링크를 누르기 전에는 로그인이 차단된다(Email not confirmed). 그런데 무료
 *   프로젝트의 기본 발송기는 하루 몇 통 수준이라 실제로 메일이 오지 않는다.
 *   즉 화면에는 가입 버튼이 있는데 아무도 가입을 끝낼 수 없는 상태가 된다.
 *
 *   그래서 서버(service_role)에서 email_confirm 을 세워 계정을 만든다.
 *
 * 정직하게 남겨 둘 것
 *   이 방식은 이메일 소유를 확인하지 않는다. 주민 대상 실서비스로 열 때는
 *   별도 SMTP를 붙이고 확인 절차를 되살려야 한다. 지금은 시연·평가 범위이므로
 *   대신 아래 두 가지로 막는다.
 *     · IP 기준 가입 횟수 제한 (계정 대량 생성 방지)
 *     · 이메일 형식·비밀번호 길이 검증
 */
import { supabaseAdmin } from '../server/supabase.js';

const WINDOW_MS = 60 * 60 * 1000;   // 1시간
const MAX_PER_WINDOW = 5;           // IP당 시간당 5계정
const hits = new Map<string, number[]>();

// 한도는 '실제로 만들어진 계정' 기준으로 센다. 형식 오류·중복 시도는 계정을
// 만들지 않으므로 세지 않는다 — 실패 시도까지 세면 검증(400·409) 몇 번에
// 한도가 소진되어 정작 가입하려는 사람이 막힌다.
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.set(ip, arr);
  return arr.length >= MAX_PER_WINDOW;
}
function countSignup(ip: string) {
  const arr = hits.get(ip) ?? [];
  arr.push(Date.now());
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 허용됩니다.' });
  }

  // IP는 제한 판단에만 쓰고 저장하지 않는다 (LG-05)
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({
      error: '가입 요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
    });
  }

  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: '이메일 형식을 확인해 주세요.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '비밀번호는 6자 이상으로 정해 주세요.' });
  }

  try {
    const sb = supabaseAdmin();
    const { error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,          // 확인 메일 없이 바로 쓸 수 있게
    });

    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes('already') || m.includes('registered') || m.includes('exists')) {
        return res.status(409).json({ error: '이미 가입된 이메일입니다. 로그인해 주세요.' });
      }
      if (m.includes('password')) {
        return res.status(400).json({ error: '비밀번호가 조건에 맞지 않습니다. 6자 이상으로 정해 주세요.' });
      }
      throw new Error(error.message);
    }

    countSignup(ip);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('가입 실패:', err);
    return res.status(500).json({ error: '가입 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}
