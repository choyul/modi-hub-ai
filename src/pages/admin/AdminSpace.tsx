import { useMemo, useState } from 'react';
import { spaces, capacityLabel, feeLabel } from '../../lib/space';

/**
 * 공간 관리.
 *
 * 표준 필드(시군·시설명·공간명·용도·수용인원·면적·이용료·예약방법·위치)의
 * 충족 상태를 담당자가 한눈에 보는 화면. 비어 있는 칸을 그럴듯하게 채우지 않고
 * 비어 있다고 표시하는 것이 이 화면의 목적이다.
 */

const REQUIRED: { key: string; label: string }[] = [
  { key: 'capacity_max', label: '수용인원' },
  { key: 'area_sqm', label: '면적' },
  { key: 'reservation_method', label: '예약방법' },
  { key: 'location', label: '위치' },
  { key: 'contact', label: '연락처' },
];

function missingFields(s: any) {
  return REQUIRED.filter((f) => s[f.key] == null || s[f.key] === '').map((f) => f.label);
}

export default function AdminSpace() {
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [facility, setFacility] = useState('all');

  const facilities = useMemo(() => [...new Set(spaces.map((s) => s.facility))], []);

  const rows = spaces.filter((s) => {
    if (facility !== 'all' && s.facility !== facility) return false;
    if (onlyIncomplete && missingFields(s).length === 0) return false;
    return true;
  });

  const incompleteCount = spaces.filter((s) => missingFields(s).length > 0).length;
  const unverifiedCount = spaces.filter((s) => !(s as any).verified).length;

  return (
    <div className="p-8 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">공간 관리</h1>
        <p className="text-slate-500 mt-1">
          등록 {spaces.length}건 · 필드 누락 {incompleteCount}건 · 실측 확인 전 {unverifiedCount}건
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-[13px] text-slate-700 leading-relaxed">
        <b className="text-slate-900">데이터 상태</b> — MODI 3개소는 준공(2026.12) 전 계획값입니다.
        농업가공교육관 요리실습장은 농업기술센터 소관이라 도시재생팀이 값을 보유하고 있지 않습니다.
        <b> 정보가 부서 경계에서 막히는 것이 이 서비스가 푸는 문제 그 자체</b>이므로, 빈 칸을
        임의로 채우지 않고 빈 칸으로 둡니다.
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={facility}
          onChange={(e) => setFacility(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 outline-none"
        >
          <option value="all">모든 시설</option>
          {facilities.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <button
          onClick={() => setOnlyIncomplete(!onlyIncomplete)}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            onlyIncomplete
              ? 'bg-amber-500 text-white'
              : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          누락 항목만 보기
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="px-4 py-3 text-left font-bold">시군</th>
              <th className="px-4 py-3 text-left font-bold">시설 · 공간</th>
              <th className="px-4 py-3 text-left font-bold">소관</th>
              <th className="px-4 py-3 text-left font-bold">수용인원</th>
              <th className="px-4 py-3 text-left font-bold">이용료</th>
              <th className="px-4 py-3 text-left font-bold">누락 필드</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((s) => {
              const missing = missingFields(s);
              return (
                <tr
                  key={s.id}
                  className={missing.length ? 'bg-amber-50/40' : ''}
                >
                  <td className="px-4 py-3 text-slate-500 text-xs">{(s as any).sigungu}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">
                      {s.facility} · {s.floor} · {s.category}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{(s as any).owner_dept}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{capacityLabel(s)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{feeLabel(s)}</td>
                  <td className="px-4 py-3">
                    {missing.length === 0 ? (
                      <span className="text-xs text-emerald-600 font-bold">완비</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {missing.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        편집은 <code className="bg-slate-100 px-1 rounded">src/data/spaces.json</code> 을 직접
        수정합니다. 담당자 편집 UI는 실제 값 확보 이후 단계입니다.
      </p>
    </div>
  );
}
