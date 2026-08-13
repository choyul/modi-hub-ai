import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, Navigate, useNavigate } from 'react-router';
import { ADMIN_TOKEN_KEY } from '../hooks/useStats';
import { adminFetch } from '../hooks/useAdminApi';
import { supabase } from '../lib/supabaseClient';

const NAV = [
  {
    group: '운영',
    items: [
      { to: '/admin', icon: 'dashboard', label: '대시보드', exact: true },
      { to: '/admin/space', icon: 'domain', label: '공간 관리' },
      { to: '/admin/reservations', icon: 'event_available', label: '대관 신청', badge: 'pending' },
      { to: '/admin/log', icon: 'forum', label: '응대 로그' },
      { to: '/admin/analytics', icon: 'analytics', label: '분석 리포트' },
    ],
  },
  {
    group: '설정',
    items: [{ to: '/admin/account', icon: 'manage_accounts', label: '계정 관리' }],
  },
] as const;

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);
  const [me, setMe] = useState<{ email: string | null; role: string } | null>(null);

  // 처리를 기다리는 신청 수. 담당자가 화면을 열자마자 알아야 하는 유일한 숫자다.
  useEffect(() => {
    let alive = true;
    adminFetch('/api/admin-reservations?status=승인대기')
      .then((b) => { if (alive) setPending(b.counts?.['승인대기'] ?? 0); })
      .catch(() => { /* 표시용 숫자다. 실패하면 그냥 안 보인다 */ });
    adminFetch('/api/admin-users')
      .then((b) => { if (alive) setMe({ email: b.me?.email ?? null, role: b.me?.role }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [location.pathname]);

  // 화면 상태 6종 중 '권한 없음'. 로그인을 거치지 않았으면 담당자 화면을 열지 않는다.
  // (localStorage 에 키 자체가 없을 때만 차단. 빈 문자열은 서버에 ADMIN_TOKEN 이
  //  설정되지 않은 제한 모드로, 로그인을 거친 상태다.)
  if (localStorage.getItem(ADMIN_TOKEN_KEY) === null) {
    return <Navigate to="/admin/login" replace />;
  }

  const logout = async () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    try { await supabase?.auth.signOut(); } catch { /* 세션이 없어도 나가는 데는 지장 없다 */ }
    navigate('/admin/login', { replace: true });
  };

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
      active
        ? 'text-emerald-600 font-bold bg-emerald-50 border-l-4 border-emerald-500'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="bg-slate-50 text-slate-900 flex overflow-hidden min-h-screen">
      <aside className="fixed left-0 top-0 h-screen w-[240px] bg-white shadow-sm flex flex-col py-6 px-4 z-50 border-r border-slate-200 overflow-y-auto">
        <div className="mb-10 px-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500 text-white flex items-center justify-center font-bold font-mono">M</div>
          <div>
            <h1 className="text-xl font-bold text-emerald-600 tracking-tight">MODI Admin</h1>
            <p className="text-slate-500 opacity-70 text-xs uppercase tracking-widest font-bold">봉화군 도시재생팀</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map((sec, i) => (
            <div key={sec.group}>
              <p className={`px-4 text-[11px] font-bold text-slate-400 uppercase mb-2 tracking-wider ${i > 0 ? 'mt-6' : ''}`}>
                {sec.group}
              </p>
              {sec.items.map((it) => {
                const active = 'exact' in it && it.exact
                  ? location.pathname === it.to
                  : location.pathname.startsWith(it.to);
                return (
                  <Link key={it.to} to={it.to} className={linkClass(active)}>
                    <span className="material-symbols-outlined text-[20px]">{it.icon}</span>
                    <span className="text-sm flex-1">{it.label}</span>
                    {'badge' in it && it.badge === 'pending' && pending > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
                        {pending}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-10 pt-4 border-t border-slate-200 flex flex-col gap-2">
          {me && (
            <div className="px-4 pb-1">
              <p className="text-xs font-bold text-slate-700 truncate">{me.email ?? '마스터키 접속'}</p>
              <p className="text-[11px] text-slate-400">{me.role === 'master' ? '마스터' : '관리자'}</p>
            </div>
          )}
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-sm font-semibold">로그아웃</span>
          </button>
        </div>
      </aside>

      <main className="ml-[240px] flex-1 h-screen overflow-y-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
