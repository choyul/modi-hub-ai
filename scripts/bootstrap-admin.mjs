/**
 * 첫 마스터 관리자 만들기 — 한 번만 하면 된다.
 *   node scripts/bootstrap-admin.mjs <이메일> <비밀번호> [이름]
 *
 * 계정 체계는 스스로를 만들 수 없다. 관리자를 추가하려면 마스터가 있어야
 * 하는데 처음에는 마스터가 없다. 그래서 서버 열쇠(SUPABASE_SECRET_KEY)를
 * 가진 사람이 첫 한 명을 세운다. 그 뒤로는 화면에서 마스터가 추가한다.
 *
 * 이미 마스터가 있으면 아무것도 하지 않는다 — 실수로 두 번 돌려도 안전하다.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const [email, password, name] = process.argv.slice(2);
if (!email || !password) {
  console.error('사용법: node scripts/bootstrap-admin.mjs <이메일> <비밀번호> [이름]');
  process.exit(1);
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const { count } = await sb
  .from('admin_users').select('*', { count: 'exact', head: true }).eq('role', 'master');
if ((count ?? 0) > 0) {
  console.log(`이미 마스터가 ${count}명 있습니다. 추가는 관리자 화면에서 하세요.`);
  process.exit(0);
}

const { data: list } = await sb.auth.admin.listUsers();
let user = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (!user) {
  const { data, error } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) { console.error('계정 생성 실패:', error.message); process.exit(1); }
  user = data.user;
  console.log('계정 생성:', email);
} else {
  console.log('기존 계정 사용:', email);
}

const { error } = await sb.from('admin_users').insert({
  user_id: user.id, email: email.toLowerCase(), name: name ?? null, role: 'master',
});
if (error) { console.error('마스터 등록 실패:', error.message); process.exit(1); }

console.log(`\n마스터 관리자 등록 완료 — ${email}`);
console.log('이 계정으로 /admin/login 에서 로그인하세요.');
