import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../hooks/useAdminApi';

/**
 * 대관 신청 관리 (AD-04) — 승인·반려.
 *
 * 담당자가 이 화면에서 가장 먼저 알고 싶은 것은 '내가 처리할 게 몇 건인가'다.
 * 그래서 승인대기를 맨 앞에 두고 기본 필터로 잡았다.
 *
 * 반려에는 사유를 받는다. 이유 없는 거절은 민원이 되고, 담당자도 나중에
 * 왜 그랬는지 기억하지 못한다.
 */

type Row = {
  id: string; createdAt: string; spaceId: string; spaceName: string;
  applicant: string; contact: string | null; useDate: string; useTime: string | null;
  headcount: number; purpose: string | null; status: string; canMoveTo: string[];
};

const STATUS_STYLE: Record<string, string> = {
  승인대기: 'bg-amber-50 text-amber-700 border-amber-200',
  예약확정: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  반려: 'bg-red-50 text-red-700 border-red-200',
  취소: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function AdminReservations() {
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState('승인대기');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = status === 'all' ? '' : `?status=${encodeURIComponent(status)}`;
      const body = await adminFetch(`/api/admin-reservations${q}`);
      setRows(body.reservations);
      setCounts(body.counts);
      setErr(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function move(r: Row, next: string) {
    let memo = '';
    if (next === '반려') {
      const input = window.prompt(
        `「${r.spaceName}」 ${r.useDate} 신청을 반려합니다.\n\n반려 사유를 적어 주세요 (신청자에게 전달됩니다).`
      );
      if (input === null) return;              // 취소
      memo = input.trim();
      if (!memo) { alert('반려 사유를 적어 주세요.'); return; }
    } else if (!window.confirm(`「${r.spaceName}」 ${r.useDate} 신청을 ${next} 처리할까요?`)) {
      return;
    }

    setBusy(r.id);
    try {
      await adminFetch('/api/admin-reservations', {
        method: 'PATCH',
        body: JSON.stringify({ id: r.id, status: next, memo }),
      });
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (loading && rows.length === 0) {
    return <div className="p-8 text-slate-500">불러오는 중…</div>;
  }
  if (err) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-lg">
          <p className="font-bold text-red-900 mb-1">신청 내역을 불러오지 못했습니다</p>
          <p className="text-sm text-red-800 mb-3">{err}</p>
          <button onClick={load} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: '승인대기', label: `승인대기 ${counts['승인대기'] ?? 0}` },
    { id: '예약확정', label: `예약확정 ${counts['예약확정'] ?? 0}` },
    { id: '반려', label: `반려 ${counts['반려'] ?? 0}` },
    { id: '취소', label: `취소 ${counts['취소'] ?? 0}` },
    { id: 'all', label: '전체' },
  ];

  return (
    <div className="p-8 pb-20">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">대관 신청 관리</h1>
          <p className="text-slate-500 mt-1">
            승인대기 {counts['승인대기'] ?? 0}건 · 확정 {counts['예약확정'] ?? 0}건 ·
            반려 {counts['반려'] ?? 0}건
          </p>
        </div>
        <button onClick={load} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600">
          새로고침
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              status === t.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <p className="font-bold text-slate-800 mb-1">
            {status === '승인대기' ? '처리할 신청이 없습니다' : '해당하는 신청이 없습니다'}
          </p>
          <p className="text-sm text-slate-500">
            주민이 신청하면 이 자리에 바로 나타납니다.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                {['접수번호', '공간', '이용일', '인원', '신청자', '목적', '상태', '처리'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-bold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className={r.status === '승인대기' ? 'bg-amber-50/40' : ''}>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{r.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 whitespace-nowrap">{r.spaceName}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {r.useDate}
                    {r.useTime && <div className="text-slate-400">{r.useTime}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{r.headcount}명</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {r.applicant}
                    {r.contact && <div className="text-slate-400">{r.contact}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">{r.purpose ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-bold whitespace-nowrap ${STATUS_STYLE[r.status] ?? ''}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {r.canMoveTo.length === 0 && (
                        <span className="text-[11px] text-slate-400">
                          {r.status === '취소' ? '신청자가 취소' : '—'}
                        </span>
                      )}
                      {r.canMoveTo.map((next) => (
                        <button
                          key={next}
                          disabled={busy === r.id}
                          onClick={() => move(r, next)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap disabled:opacity-40 ${
                            next === '예약확정'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {next === '예약확정' ? '승인' : next}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4 leading-relaxed">
        승인·반려는 누가 언제 했는지 기록에 남습니다. 신청자가 스스로 취소한 건은
        담당자가 되살리지 않습니다 — 본인이 물린 것을 남이 되돌리면 다른 사람의 예약이 됩니다.
      </p>
    </div>
  );
}
