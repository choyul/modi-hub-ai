import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ADMIN_TOKEN_KEY } from '../../hooks/useStats';

/**
 * 담당자 로그인.
 *
 * 이전 화면은 아무 값이나 넣으면 통과하고 상태도 남기지 않아, /admin 이 사실상
 * 열려 있었다(화면 상태 6종 중 '권한 없음' 미처리).
 *
 * 지금은 서버의 ADMIN_TOKEN 과 실제로 대조한다. 통과해야만 원문 질의·연락처가
 * 내려오므로, 화면 통과와 데이터 권한이 같은 기준으로 움직인다.
 */
export default function AdminLogin() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const res = await fetch('/api/stats', { headers: { 'x-admin-token': token } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '서버에 연결하지 못했습니다.');

      if (data.detailAuthorized) {
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
        navigate('/admin');
        return;
      }

      if (!data.tokenConfigured) {
        // 서버에 토큰이 없으면 아무도 못 들어간다. 잠기는 대신 제한 모드로 들여보내고
        // 그 사실을 화면에 계속 표시한다.
        localStorage.setItem(ADMIN_TOKEN_KEY, '');
        navigate('/admin');
        return;
      }

      setError('토큰이 일치하지 않습니다. 서버에 설정한 ADMIN_TOKEN 값을 확인해 주세요.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-emerald-600" aria-hidden="true">
              admin_panel_settings
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">MODI Hub 담당자</h1>
          <p className="text-slate-500 text-sm">봉화군 도시재생팀 · 미충족 수요 관리</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-token" className="block text-sm font-bold text-slate-700 mb-1.5">
              담당자 토큰
            </label>
            <input
              id="admin-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="서버에 설정한 ADMIN_TOKEN"
            />
            <p className="text-[11.5px] text-slate-400 mt-1.5">
              환경변수 <code className="bg-slate-100 px-1 rounded">ADMIN_TOKEN</code> 값입니다.
              주민 화면은 로그인 없이 그대로 이용할 수 있습니다.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl">{error}</div>
          )}

          <button
            type="submit"
            disabled={checking}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            {checking ? '확인 중…' : '들어가기'}
          </button>
        </form>
      </div>
    </div>
  );
}
