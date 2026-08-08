import { useState } from 'react';
import spacesData from '../../data/spaces.json';
import { useStats, ADMIN_TOKEN_KEY } from '../../hooks/useStats';
import { StorageBadge, EmptyState } from '../../components/AdminShared';

/**
 * 응대 로그.
 * 과제정의서 §3-2의 3종 로그(성공·실패·원문)를 그대로 보여준다.
 * 원문 질의는 ADMIN_TOKEN 을 입력했을 때만 서버가 내려준다.
 */

const spaceName = (id: string) => spacesData.spaces.find((s) => s.id === id)?.name || id;

export default function AdminLog() {
  const { stats, loading, error, reload } = useStats();
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || '');
  const [filter, setFilter] = useState<'all' | 'unmet' | 'success'>('all');

  function saveToken() {
    localStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
    reload();
  }

  const rows = (stats?.recent || []).filter((r) =>
    filter === 'all' ? true : r.outcome === filter
  );

  return (
    <div className="p-8 pb-20">
      <div className="flex flex-wrap justify-between items-end gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">응대 로그</h1>
          <p className="text-slate-500 mt-1">
            검색 1건마다 자동 적재됩니다. 성공·실패·원문 질문이 함께 남습니다.
          </p>
        </div>
        {stats && <StorageBadge persisted={stats.persisted} />}
      </div>

      {/* 원문 조회 권한 */}
      {stats && !stats.detailAuthorized && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 mt-0.5">lock</span>
            <div className="flex-1">
              <p className="font-bold text-slate-800 text-sm mb-1">
                원문 질의는 가려져 있습니다
              </p>
              <p className="text-[13px] text-slate-600 mb-3">
                {stats.detailNotice ||
                  '담당자 토큰이 확인되지 않아 원문 질의와 연락처는 내려받지 않았습니다.'}
              </p>
              <div className="flex gap-2 max-w-md">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ADMIN_TOKEN"
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={saveToken}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {(
          [
            { id: 'all', label: '전체' },
            { id: 'unmet', label: `미충족 ${stats?.summary.unmetCount ?? 0}건` },
            { id: 'success', label: `성공 ${stats?.summary.successCount ?? 0}건` },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              filter === f.id
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">불러오는 중…</div>
        ) : error ? (
          <div className="p-12 text-center text-sm text-slate-500">{error}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="search_off"
            title="해당 조건의 로그가 없습니다"
            desc="주민 화면에서 검색이 발생하면 즉시 여기에 나타납니다."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">시각</th>
                  <th className="px-4 py-3 text-left font-bold">원문 질문</th>
                  <th className="px-4 py-3 text-left font-bold">파싱된 조건</th>
                  <th className="px-4 py-3 text-left font-bold">결과</th>
                  <th className="px-4 py-3 text-left font-bold">응답</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((log, i) => (
                  <tr
                    key={`${log.ts}-${i}`}
                    className={
                      log.outcome === 'unmet'
                        ? 'border-l-4 border-l-red-500 bg-red-50/30'
                        : 'border-l-4 border-l-transparent'
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.ts).toLocaleString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-xs">
                      {log.rawQuery}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {[
                        log.parsed.purpose,
                        log.parsed.headcount ? `${log.parsed.headcount}명` : null,
                        log.parsed.region,
                        log.parsed.whenText,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {log.outcome === 'unmet' ? (
                        <div>
                          <div className="font-bold text-red-600 text-xs mb-0.5">미충족</div>
                          <div className="text-xs text-slate-500">{log.unmetType}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-emerald-600 text-xs mb-0.5">성공</div>
                          <div className="text-xs text-slate-500">
                            {log.shownSpaceIds.map(spaceName).join(', ')}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {(log.latencyMs / 1000).toFixed(1)}초
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        IP·위치·브라우저 정보는 수집하지 않으며, 질의문에 섞인 연락처·이메일은 적재 단계에서 자동
        마스킹됩니다.
      </p>
    </div>
  );
}
