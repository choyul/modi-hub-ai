import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

export default function UserLogin() {
  const [email, setEmail] = useState('demo@bonghwa.go.kr');
  const [password, setPassword] = useState('modi2026');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate(-1); // 이전 페이지로 복귀 (또는 홈으로)
    } else {
      setError('이메일 또는 비밀번호가 일치하지 않습니다. (데모 계정: demo@bonghwa.go.kr / modi2026)');
    }
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-slate-200 p-8 mb-20">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-sm">
              M
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold leading-none text-slate-800">MODI Hub AI</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Bonghwa Urban Regeneration</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">로그인</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl whitespace-pre-wrap">{error}</div>}
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">이메일</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" 
            />
          </div>
          
          <div className="relative">
            <label className="block text-sm font-bold text-slate-700 mb-1.5">비밀번호</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-12 transition-colors" 
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] pt-0.5">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>

          <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-sm transition-colors mt-4 shrink-0">
            로그인
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="#" className="text-slate-500 hover:text-slate-800 text-sm font-bold transition-colors">회원가입</a>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <Link to="/admin/login" className="text-xs text-slate-400 hover:text-slate-600 font-bold transition-colors flex items-center justify-center gap-1">
            관리자이신가요? 관리자 로그인 <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
