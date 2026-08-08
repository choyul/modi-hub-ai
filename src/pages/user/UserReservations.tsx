import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import spacesData from '../../data/spaces.json';

/**
 * 예약 신청 · 신청 현황.
 *
 * 범위는 "신청 접수 + 담당자 승인 대기"까지다. 이 화면은 어떤 경우에도
 * 스스로 예약을 확정하지 않으며, 그 사실을 사용자에게 명시한다.
 * /search 에서 "예약 신청하기"를 누르면 ?apply=<공간ID> 로 들어온다.
 */

interface Reservation {
  id: string;
  ts: string;
  spaceId: string;
  applicant: string;
  useDate: string;
  useTime: string;
  headcount: number;
  purpose: string;
  status: '승인대기' | '예약확정' | '반려';
}

const findSpace = (id: string) => spacesData.spaces.find((s) => s.id === id);

export default function UserReservations() {
  const { isLoggedIn, userName } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const applyId = searchParams.get('apply');
  const applySpace = applyId ? findSpace(applyId) : undefined;

  const [list, setList] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [persisted, setPersisted] = useState(true);

  const [useDate, setUseDate] = useState('');
  const [useTime, setUseTime] = useState('');
  const [headcount, setHeadcount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    if (!userName) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reservation?applicant=${encodeURIComponent(userName)}`);
      const data = await res.json();
      setList(data.reservations || []);
      setPersisted(data.persisted !== false);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName]);

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  async function submitApplication(e: FormEvent) {
    e.preventDefault();
    if (!applySpace) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: applySpace.id,
          applicant: userName,
          useDate,
          useTime,
          headcount: Number(headcount),
          purpose,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '신청에 실패했습니다.');
      navigate('/reservations', { replace: true });
      await load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* ── 신청 폼 ── */}
        {applySpace && (
          <div className="bg-white border-2 border-indigo-100 rounded-2xl shadow-sm p-6 md:p-8 mb-10">
            <div className="mb-5">
              <div className="text-xs font-bold text-indigo-600 mb-1">대관 신청</div>
              <h2 className="text-2xl font-bold text-slate-900">{applySpace.name}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {applySpace.facility} · {applySpace.floor} · 최대 {applySpace.capacity_max}명 ·
                최소 {applySpace.reservation_lead_days}일 전 신청
              </p>
            </div>

            <form onSubmit={submitApplication} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    이용 희망일
                  </label>
                  <input
                    type="date"
                    required
                    value={useDate}
                    onChange={(e) => setUseDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    이용 시간 <span className="font-normal text-slate-400">(선택)</span>
                  </label>
                  <input
                    type="text"
                    value={useTime}
                    onChange={(e) => setUseTime(e.target.value)}
                    placeholder="예: 14:00~16:00"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">이용 인원</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={applySpace.capacity_max}
                  value={headcount}
                  onChange={(e) => setHeadcount(e.target.value)}
                  placeholder={`1 ~ ${applySpace.capacity_max}명`}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">이용 목적</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="예: 부녀회 김장 행사"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl">
                  {formError}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-[16px] text-slate-400">info</span>
                신청하면 <b className="text-slate-700 mx-1">승인대기</b> 상태로 접수됩니다. 이
                화면에서 예약이 확정되지는 않으며, 담당자 확인 후 연락드립니다.
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  {submitting ? '접수 중…' : '신청 접수하기'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/reservations', { replace: true })}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── 신청 현황 ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">신청 현황</h1>
          <p className="text-slate-500 mt-2">{userName}님이 접수한 대관 신청 내역입니다.</p>
          {!persisted && (
            <p className="mt-3 inline-block text-[12.5px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-1.5">
              저장소가 연결되지 않아 임시 보관 중입니다. 서버가 재시작되면 내역이 사라집니다.
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">불러오는 중…</div>
          ) : list.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">
                event_note
              </span>
              <p className="text-slate-500 text-sm mb-4">아직 접수한 신청이 없습니다.</p>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm"
              >
                공간 찾아보기
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.map((rev) => {
                const space = findSpace(rev.spaceId);
                return (
                  <li key={rev.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-[11px] font-bold rounded ${
                          rev.status === '예약확정'
                            ? 'bg-indigo-100 text-indigo-700'
                            : rev.status === '반려'
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {rev.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{rev.id}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                      {space?.name || rev.spaceId}
                    </h3>
                    <div className="text-sm text-slate-600 mb-3">{space?.facility}</div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">
                          calendar_month
                        </span>
                        {rev.useDate} {rev.useTime}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">
                          group
                        </span>
                        {rev.headcount}명
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">
                          label
                        </span>
                        {rev.purpose}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
