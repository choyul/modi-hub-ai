/**
 * 관리자 계정 관리 — 마스터 전용.
 *
 *   GET    목록 (마스터·관리자 모두 조회 가능 — 누가 담당인지는 서로 알아야 한다)
 *   POST   { email, password?, name, role }  관리자 추가
 *   PATCH  { userId, role }                  역할 변경
 *   DELETE { userId }                        관리자 해제
 *
 * '해제'는 계정을 지우는 것이 아니라 관리자 명단에서 빼는 것이다. 사람은
 * 그대로 두고 권한만 거둔다 — 그가 남긴 예약·기록이 주인을 잃지 않도록.
 *
 * 마스터가 자기 자신을 강등하거나 해제하는 것은 막는다. 마스터가 0명이 되면
 * 아무도 관리자를 추가할 수 없고, 남는 길은 서버 환경변수(ADMIN_TOKEN)뿐이다.
 */
import { applyCors } from '../server/cors.js';
import { supabaseAdmin } from '../server/supabase.js';
import { requireAdmin, logAction, deny } from '../server/adminAuth.js';

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  const sb = supabaseAdmin();

  try {
    // ── 조회: 관리자면 누구나 ────────────────────────────
    if (req.method === 'GET') {
      const me = await requireAdmin(req, 'admin');
      if (!me) return deny(res);

      const { data, error } = await sb
        .from('admin_users')
        .select('user_id, email, name, role, created_at, last_seen_at')
        .order('role')
        .order('created_at');
      if (error) throw new Error(error.message);

      return res.status(200).json({
        admins: data ?? [],
        me: { userId: me.userId, email: me.email, role: me.role, viaToken: me.viaToken },
      });
    }

    // ── 이하 변경 작업: 마스터만 ─────────────────────────
    const me = await requireAdmin(req, 'master');
    if (!me) return deny(res, 'master');

    if (req.method === 'POST') {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const name = String(req.body?.name ?? '').trim() || null;
      const role = req.body?.role === 'master' ? 'master' : 'admin';
      const password = String(req.body?.password ?? '');

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: '이메일 형식을 확인해 주세요.' });
      }

      // 이미 가입한 사람이면 그 계정에 권한만 준다. 계정을 또 만들지 않는다.
      const { data: list } = await sb.auth.admin.listUsers();
      const users: any[] = list?.users ?? [];
      let user: any = users.find((u) => String(u.email ?? '').toLowerCase() === email);
      const isNewAccount = !user;

      if (!user) {
        if (password.length < 6) {
          return res.status(400).json({
            error: '가입되지 않은 이메일입니다. 임시 비밀번호(6자 이상)를 함께 입력해 주세요.',
          });
        }
        const { data: created, error: cErr } = await sb.auth.admin.createUser({
          email, password, email_confirm: true,
        });
        if (cErr) throw new Error(cErr.message);
        user = created.user;
      }

      const { data: exist } = await sb
        .from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
      if (exist) {
        return res.status(409).json({ error: '이미 관리자로 등록된 계정입니다.' });
      }

      const { error: iErr } = await sb.from('admin_users').insert({
        user_id: user.id, email, name, role, created_by: me.userId,
      });
      if (iErr) throw new Error(iErr.message);

      await logAction(me, 'admin.add', email, { role, newAccount: isNewAccount });
      return res.status(200).json({ ok: true, userId: user.id });
    }

    if (req.method === 'PATCH') {
      const userId = String(req.body?.userId ?? '').trim();
      const role = req.body?.role === 'master' ? 'master' : 'admin';
      if (!userId) return res.status(400).json({ error: '대상을 지정해 주세요.' });

      if (me.userId && userId === me.userId && role !== 'master') {
        return res.status(400).json({
          error: '자기 자신을 강등할 수 없습니다. 다른 마스터가 변경해 주세요.',
        });
      }

      const { data: before } = await sb
        .from('admin_users').select('email, role').eq('user_id', userId).maybeSingle();
      if (!before) return res.status(404).json({ error: '관리자 명단에 없는 계정입니다.' });

      // 마지막 마스터를 강등하면 아무도 관리자를 추가할 수 없게 된다
      if (before.role === 'master' && role !== 'master') {
        const { count } = await sb
          .from('admin_users').select('*', { count: 'exact', head: true }).eq('role', 'master');
        if ((count ?? 0) <= 1) {
          return res.status(400).json({ error: '마지막 마스터는 강등할 수 없습니다.' });
        }
      }

      const { error } = await sb.from('admin_users').update({ role }).eq('user_id', userId);
      if (error) throw new Error(error.message);

      await logAction(me, 'admin.role', before.email, { from: before.role, to: role });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const userId = String(req.body?.userId ?? '').trim();
      if (!userId) return res.status(400).json({ error: '대상을 지정해 주세요.' });
      if (me.userId && userId === me.userId) {
        return res.status(400).json({ error: '자기 자신은 해제할 수 없습니다.' });
      }

      const { data: before } = await sb
        .from('admin_users').select('email, role').eq('user_id', userId).maybeSingle();
      if (!before) return res.status(404).json({ error: '관리자 명단에 없는 계정입니다.' });

      if (before.role === 'master') {
        const { count } = await sb
          .from('admin_users').select('*', { count: 'exact', head: true }).eq('role', 'master');
        if ((count ?? 0) <= 1) {
          return res.status(400).json({ error: '마지막 마스터는 해제할 수 없습니다.' });
        }
      }

      // 계정은 남기고 권한만 거둔다 — 그가 남긴 기록이 주인을 잃지 않도록
      const { error } = await sb.from('admin_users').delete().eq('user_id', userId);
      if (error) throw new Error(error.message);

      await logAction(me, 'admin.remove', before.email, { role: before.role });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'GET, POST, PATCH, DELETE만 허용됩니다.' });
  } catch (err) {
    console.error('관리자 계정 처리 실패:', err);
    // 테이블이 없으면 "잠시 후 다시" 해 봐야 소용없다. 무엇을 해야 하는지 알려준다.
    if (String((err as Error)?.message ?? '').includes('admin_users')) {
      return res.status(503).json({
        error: '관리자 테이블(admin_users)이 아직 만들어지지 않았습니다. supabase/migrations/0002_admin.sql 을 실행해 주세요.',
      });
    }
    return res.status(500).json({ error: '처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}
