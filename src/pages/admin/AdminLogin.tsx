import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (password) navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-emerald-600">admin_panel_settings</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">MODI Hub 관리자</h1>
          <p className="text-slate-500 text-sm">봉화군 도시재생 거점시설 통합 안내 시스템</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">아이디</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-sm"
              defaultValue="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">비밀번호</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="비밀번호를 입력하세요 (아무 값이나 생략)"
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-3.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors mt-4"
          >
            로그인
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400 font-mono">
          &copy; 2024 Bonghwa MDI. All rights reserved.
        </div>
      </div>
    </div>
  );
}
