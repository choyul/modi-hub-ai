import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adminFetch } from '../../hooks/useAdminApi';

/**
 * 계정 관리 (AD-15) — 마스터가 관리자를 늘리고 줄인다.
 *
 * 예전에는 예시 사용자를 보여주는 화면 구성안이었다. 지금은 실제 계정을
 * 다룬다 — 계정 자체는 Supabase Auth 가 갖고, 이 표는 '누가 관리자인가'만 본다.
 *
 * 두 가지를 막아 둔다
 *   · 자기 자신을 강등·해제 (자물쇠를 안에서 잠그고 열쇠를 버리는 일)
 *   · 마지막 마스터 강등·해제 (아무도 관리자를 추가할 수 없게 된다)
 * 서버에서도 같은 규칙을 검사한다. 화면만 막으면 막은 것이 아니다.
 */

type Admin = {
  user_id: string; email: string; name: string | null;
  role: 'master' | 'admin'; created_at: string; last_seen_at: string | null;
};

const ROLE_LABEL = { master: '마스터', admin: '관리자' } as const;
const ROLE_DESC = {
  master: '관리자를 추가·변경·해제할 수 있습니다. 공간·예약도 모두 다룹니다.',
  admin: '공간 정보와 대관 신청을 다룹니다. 관리자 명단은 볼 수만 있습니다.',
} as const;

function when(iso: string | null) {
  if (!iso) return '기록 없음';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 1) return '방금 전';
  if (diff < 60) return `${Math.floor(diff)}분 전`;
  if (diff < 60 * 24) return `${Math.floor(diff / 60)}시간 전`;
  return d.toLocaleDateString('ko-KR');
}

export default function AdminAccount() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [me, setMe] = useState<{ userId: string | null; role: string; viaToken: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = await adminFetch('/api/admin-users');
      setAdmins(body.admins);
      setMe(body.me);
      setErr(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isMaster = me?.role === 'master';

  async function changeRole(a: Admin, role: 'master' | 'admin') {
    if (!window.confirm(`${a.email} 을(를) ${ROLE_LABEL[role]}로 바꿀까요?`)) return;
    try {
      await adminFetch('/api/admin-users', {
        method: 'PATCH', body: JSON.stringify({ userId: a.user_id, role }),
      });
      await load();
    } catch (e: any) { alert(e.message); }
  }

  async function remove(a: Admin) {
    if (!window.confirm(
      `${a.email} 의 관리자 권한을 거둘까요?\n\n계정은 삭제되지 않습니다 — 관리자 명단에서만 빠지고, ` +
      `그가 남긴 기록은 그대로 남습니다.`
    )) return;
    try {
      await adminFetch('/api/admin-users', {
        method: 'DELETE', body: JSON.stringify({ userId: a.user_id }),
      });
      await load();
    } catch (e: any) { alert(e.message); }
  }

  if (loading && admins.length === 0) {
    return <div className="p-8 text-slate-500">불러오는 중…</div>;
  }
  if (err) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-xl">
          <p className="font-bold text-red-900 mb-1">관리자 명단을 불러오지 못했습니다</p>
          <p className="text-sm text-red-800 mb-3">{err}</p>
          <button onClick={load} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-20 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">계정 관리</h1>
          <p className="text-slate-500 mt-1">
            관리자 {admins.length}명 · 마스터 {admins.filter((a) => a.role === 'master').length}명
          </p>
        </div>
        {isMaster && (
          <button
            onClick={() => setOpen(true)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold"
          >
            관리자 추가
          </button>
        )}
      </div>

      {me?.viaToken && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-[13px] text-slate-700 leading-relaxed">
          <b className="text-slate-900">마스터키로 접속 중입니다.</b> 이 방식은 누가 무엇을 했는지
          남지 않습니다. 본인 계정을 관리자로 추가한 뒤 그 계정으로 로그인해 쓰시는 것을 권합니다.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              {['이름 · 이메일', '역할', '등록일', '마지막 접속', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-bold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.map((a) => {
              const isMe = me?.userId === a.user_id;
              return (
                <tr key={a.user_id}>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">
                      {a.name || a.email.split('@')[0]}
                      {isMe && <span className="ml-2 text-[11px] font-bold text-indigo-600">본인</span>}
                    </div>
                    <div className="text-xs text-slate-500">{a.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      a.role === 'master'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {ROLE_LABEL[a.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {when(a.last_seen_at)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {isMaster && !isMe ? (
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => changeRole(a, a.role === 'master' ? 'admin' : 'master')}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          {a.role === 'master' ? '관리자로' : '마스터로'}
                        </button>
                        <button
                          onClick={() => remove(a)}
                          className="px-3 py-1.5 border border-red-200 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          권한 해제
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        {isMe ? '자기 자신은 바꿀 수 없습니다' : '마스터만 변경'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {(['master', 'admin'] as const).map((r) => (
          <div key={r} className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="font-bold text-slate-900 text-sm mb-1">{ROLE_LABEL[r]}</p>
            <p className="text-[12.5px] text-slate-500 leading-relaxed">{ROLE_DESC[r]}</p>
          </div>
        ))}
      </div>

      {open && <AddPanel onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
    </div>
  );
}

// ── 관리자 추가 ──────────────────────────────────────────────
function AddPanel({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'master' | 'admin'>('admin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminFetch('/api/admin-users', {
        method: 'POST',
        body: JSON.stringify({ email, name, password, role }),
      });
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400';

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-slate-900">관리자 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-bold">닫기</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto grow">
          <p className="text-[13px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-600 leading-relaxed">
            이미 가입한 사람이면 <b className="text-slate-800">권한만 부여</b>됩니다. 계정이 없으면
            임시 비밀번호로 새로 만들어 드립니다 — 첫 로그인 후 본인이 바꾸도록 안내해 주세요.
          </p>

          <label className="block">
            <span className="block text-xs font-bold text-slate-600 mb-1">이메일</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className={field} required autoComplete="off" />
          </label>

          <label className="block">
            <span className="block text-xs font-bold text-slate-600 mb-1">이름</span>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className={field} placeholder="예: 김민서 주무관" />
          </label>

          <label className="block">
            <span className="block text-xs font-bold text-slate-600 mb-1">
              임시 비밀번호 <span className="font-normal text-slate-400">(가입되지 않은 이메일일 때만 필요 · 6자 이상)</span>
            </span>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
              className={field} autoComplete="off" />
          </label>

          <label className="block">
            <span className="block text-xs font-bold text-slate-600 mb-1">역할</span>
            <select value={role} onChange={(e) => setRole(e.target.value as 'master' | 'admin')}
              className={field}>
              <option value="admin">관리자 — 공간·예약을 다룹니다</option>
              <option value="master">마스터 — 관리자까지 관리합니다</option>
            </select>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600">
              취소
            </button>
            <button type="submit" disabled={busy}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
              {busy ? '추가 중…' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
