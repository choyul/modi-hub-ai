import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import spacesData from '../../data/spaces.json';
import { capacityLabel, feeLabel, type Space } from '../../lib/space';

/**
 * 공무원용 조건 필터 (SP-07) — 워크시트 MVP의 두 번째 사용자.
 *
 * 이 화면은 AI 를 쓰지 않는다. 런타임 4계층 중 ① 하나만으로 동작하며,
 * LLM·저장소·외부 연결이 전부 끊겨도 살아 있다 — 축퇴의 마지막 층을
 * 그대로 화면으로 만든 것. 로그인도 없다 (허들 0).
 */
export default function FilterPage() {
  const [category, setCategory] = useState('all');
  const [minHeadcount, setMinHeadcount] = useState('');
  const [facility, setFacility] = useState('all');

  const facilities = useMemo(
    () => [...new Set(spacesData.spaces.map((s) => s.facility))], []
  );

  const rows = useMemo(() => {
    const n = parseInt(minHeadcount, 10);
    return (spacesData.spaces as Space[])
      .filter((s) => category === 'all' || s.category === category)
      .filter((s) => facility === 'all' || s.facility === facility)
      .filter((s) => !Number.isFinite(n) || (s.capacity_max != null && s.capacity_max >= n))
      .sort((a, b) => (a.capacity_max ?? 999) - (b.capacity_max ?? 999));
  }, [category, facility, minHeadcount]);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20 print:bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">공간 조건 조회</h1>
            <p className="text-slate-500 mt-1">행사·교육 공간 확보용 — 조건만 고르면 바로 표가 나옵니다.</p>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 print:hidden"
          >
            인쇄
          </button>
        </div>

        <p className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-6">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">bolt</span>
          이 화면은 AI를 사용하지 않습니다 — 외부 연결이 끊겨도 동작
        </p>

        {/* 필터 바 */}
        <div className="flex flex-wrap gap-2 mb-6 print:hidden">
          <label className="sr-only" htmlFor="f-category">용도</label>
          <select
            id="f-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none"
          >
            <option value="all">모든 용도</option>
            {spacesData._meta.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="sr-only" htmlFor="f-facility">시설</label>
          <select
            id="f-facility"
            value={facility}
            onChange={(e) => setFacility(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none"
          >
            <option value="all">모든 시설</option>
            {facilities.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>

          <label className="sr-only" htmlFor="f-headcount">최소 인원</label>
          <input
            id="f-headcount"
            type="number"
            min={1}
            value={minHeadcount}
            onChange={(e) => setMinHeadcount(e.target.value)}
            placeholder="최소 인원"
            className="w-32 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
          />
        </div>

        {/* 결과 표 */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              조건에 맞는 공간이 없습니다. 인원을 줄이거나 용도를 바꿔 보세요.
            </div>
          ) : (
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  {['공간', '용도', '수용', '이용료', '소관 부서', '연락처', '예약 방법', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500">{s.facility} · {s.floor}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.category}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{capacityLabel(s)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{feeLabel(s)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{(s as any).owner_dept ?? '확인 필요'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.contact ?? '확인 필요'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.reservation_method ?? '확인 필요'}</td>
                    <td className="px-4 py-3 print:hidden">
                      <Link to={`/spaces/${s.id}`} className="text-indigo-600 font-bold text-xs hover:underline whitespace-nowrap">
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-slate-400 mt-4">
          {rows.length}건 · 수용 인원 오름차순 · 「확인 필요」는 값을 지어내지 않고 비워 둔 항목입니다.
        </p>
      </div>
    </div>
  );
}
