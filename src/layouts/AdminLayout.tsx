import { Link, Outlet, useLocation } from 'react-router';

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="bg-slate-50 text-slate-900 flex overflow-hidden min-h-screen">
      <aside className="fixed left-0 top-0 h-screen w-[240px] bg-white shadow-sm flex flex-col py-6 px-4 z-50 border-r border-slate-200">
        <div className="mb-10 px-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500 text-white flex items-center justify-center font-bold font-mono">M</div>
          <div>
            <h1 className="text-xl font-bold text-emerald-600 tracking-tight">MODI Admin</h1>
            <p className="text-slate-500 opacity-70 text-xs uppercase tracking-widest font-bold">봉화군 도시재생팀</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <p className="px-4 text-[11px] font-bold text-slate-400 uppercase mb-2 tracking-wider">운영</p>
          <Link to="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/admin' ? 'text-emerald-600 font-bold bg-emerald-50 border-l-4 border-emerald-500' : 'text-slate-600 hover:bg-slate-100'}`}>
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-sm">대시보드</span>
          </Link>
          <Link to="/admin/space" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/admin/space' ? 'text-emerald-600 font-bold bg-emerald-50 border-l-4 border-emerald-500' : 'text-slate-600 hover:bg-slate-100'}`}>
            <span className="material-symbols-outlined text-[20px]">domain</span>
            <span className="text-sm">공간 관리</span>
          </Link>
          <Link to="/admin/log" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/admin/log' ? 'text-emerald-600 font-bold bg-emerald-50 border-l-4 border-emerald-500' : 'text-slate-600 hover:bg-slate-100'}`}>
            <span className="material-symbols-outlined text-[20px]">forum</span>
            <span className="text-sm">응대 로그</span>
          </Link>
          <Link to="/admin/analytics" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/admin/analytics' ? 'text-emerald-600 font-bold bg-emerald-50 border-l-4 border-emerald-500' : 'text-slate-600 hover:bg-slate-100'}`}>
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            <span className="text-sm">분석 리포트</span>
          </Link>

          <p className="px-4 text-[11px] font-bold text-slate-400 uppercase mb-2 mt-6 tracking-wider">설정</p>
          <Link to="/admin/account" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/admin/account' ? 'text-emerald-600 font-bold bg-emerald-50 border-l-4 border-emerald-500' : 'text-slate-600 hover:bg-slate-100'}`}>
            <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
            <span className="text-sm">계정 관리</span>
          </Link>
        </nav>

        <div className="mt-10 pt-4 border-t border-slate-200 flex flex-col gap-2">
          <Link to="/" className="flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-sm font-semibold">로그아웃</span>
          </Link>
        </div>
      </aside>

      <main className="ml-[240px] flex-1 h-screen overflow-y-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
