import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

/**
 * 로그인·회원가입 (AU-01) — Supabase Auth 실계정.
 * 데모 계정 하드코딩·기본값 채움을 제거했다. 대관 신청에만 필요하다.
 */
export default function UserLogin() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, signUp, authConfigured } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'login') {
        const err = await login(email, password);
        if (err) setError(err);
        else navigate(-1);
      } else {
        const err = await signUp(email, password);
        if (err && err.startsWith('확인 메일')) { setInfo(err); setMode('login'); }
        else if (err) setError(err);
        else navigate(-1);   // 세션 즉시 생성됨
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-6">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-slate-200 p-8 mb-20">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h1>
          <p className="text-[13px] text-slate-500">
            공간 검색·둘러보기는 로그인 없이 이용하실 수 있어요.
            <br />로그인은 <b className="text-slate-700">대관 신청</b>에만 필요합니다.
          </p>
        </div>

        {/* 모드 전환 탭 */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(''); setInfo(''); }}
              className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                mode === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
              }`}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {!authConfigured && (
          <div className="p-3 mb-4 bg-amber-50 text-amber-800 text-sm rounded-xl">
            로그인 서비스가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl">{error}</div>}
          {info && <div className="p-3 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl">{info}</div>}

          <div>
            <label htmlFor="login-email" className="block text-sm font-bold text-slate-700 mb-1.5">이메일</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="relative">
            <label htmlFor="login-password" className="block text-sm font-bold text-slate-700 mb-1.5">
              비밀번호 {mode === 'signup' && <span className="font-normal text-slate-400">(6자 이상)</span>}
            </label>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-12"
            />
            <button
              type="button"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[20px] pt-0.5" aria-hidden="true">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          <button
            type="submit"
            disabled={busy || !authConfigured}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            {busy ? '확인 중…' : mode === 'login' ? '로그인' : '가입하기'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <Link to="/admin/login" className="text-xs text-slate-400 hover:text-slate-600 font-bold flex items-center justify-center gap-1">
            담당자이신가요? 담당자 로그인
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
