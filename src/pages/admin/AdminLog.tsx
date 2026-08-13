import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import spacesData from '../../data/spaces.json';
import { useStats, ADMIN_TOKEN_KEY, type SearchLogRow } from '../../hooks/useStats';
import { StorageBadge, EmptyState } from '../../components/AdminShared';

/**
 * 응대 로그.
 * 과제정의서 §3-2의 3종 로그(성공·실패·원문)를 그대로 보여준다.
 * 원문 질의는 관리자로 확인됐을 때만 서버가 내려준다.
 *
 * 보는 방식이 둘이다.
 *   · 목록 — 한 건씩. 무엇이 언제 어떻게 됐는지 확인할 때.
 *   · 묶어보기 — 같은 말을 여러 사람이 했는지 볼 때. 로그가 쌓일수록
 *     한 건씩 읽는 것은 의미가 없어지고, 반복되는 질문이 곧 할 일이 된다.
 */

const spaceName = (id: string) => spacesData.spaces.find((s) => s.id === id)?.name || id;

const LAYER_LABEL: Record<string, string> = {
  filter: '① 조건필터', fuzzy: '② 퍼지', embedding: '③ 임베딩', llm: '④ LLM',
};

const PERIODS = [
  { id: 'all', label: '전체 기간', days: 0 },
  { id: '7', label: '최근 7일', days: 7 },
  { id: '30', label: '최근 30일', days: 30 },
] as const;

const PAGE_SIZE = 25;

/**
 * 묶기용 열쇠 — 같은 말인지 판단하는 기준.
 * 조사·공백·문장부호를 털어낸다. 「회의실 5명」과 「회의실5명이요」는 같은 질문이다.
 * 완벽한 형태소 분석은 아니고, 그럴 필요도 없다 — 담당자가 눈으로 확인할 묶음이다.
 */
function groupKey(q: string) {
  return q
    .toLowerCase()
    .replace(/[.,!?~・·\s]/g, '')
    .replace(/(을|를|이|가|은|는|에서|에게|으로|로|요|해줘|해주세요|있나요|있어요|알려줘)$/g, '');
}

function toCsv(rows: SearchLogRow[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['시각', '원문 질문', '용도', '인원', '지역', '시점', '결과', '미충족 유형', '응답 계층', '노출 공간', '소요(ms)'];
  const body = rows.map((r) => [
    new Date(r.ts).toLocaleString('ko-KR'),
    r.rawQuery,
    r.parsed.purpose, r.parsed.headcount, r.parsed.region, r.parsed.whenText,
    r.outcome === 'unmet' ? '미충족' : '성공',
    r.unmetType,
    LAYER_LABEL[r.answeredBy ?? ''] ?? r.answeredBy,
    r.shownSpaceIds.map(spaceName).join(' / '),
    r.latencyMs,
  ].map(esc).join(','));
  // 엑셀이 UTF-8 로 읽도록 BOM 을 붙인다. 없으면 한글이 깨진 채로 열린다.
  return '﻿' + [head.map(esc).join(','), ...body].join('\r\n');
}

export default function AdminLog() {
  const { stats, loading, error } = useStats();
  const navigate = useNavigate();

  const [outcome, setOutcome] = useState<'all' | 'unmet' | 'success'>('all');
  const [layer, setLayer] = useState<string>('all');
  const [period, setPeriod] = useState<string>('all');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'list' | 'grouped'>('list');
  const [page, setPage] = useState(0);

  function relogin() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate('/admin/login', { replace: true });
  }

  const all = stats?.recent ?? [];

  const rows = useMemo(() => {
    const days = PERIODS.find((p) => p.id === period)?.days ?? 0;
    const since = days ? Date.now() - days * 86400_000 : 0;
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (outcome !== 'all' && r.outcome !== outcome) return false;
      if (layer !== 'all' && (r.answeredBy ?? '') !== layer) return false;
      if (since && new Date(r.ts).getTime() < since) return false;
      if (needle) {
        const hay = [r.rawQuery, r.parsed.purpose, r.parsed.region, r.unmetType]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [all, outcome, layer, period, q]);

  // 같은 질문 묶기 — 건수가 많은 순. 반복되는 미충족이 맨 위로 올라온다.
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: SearchLogRow[] }>();
    for (const r of rows) {
      const k = groupKey(r.rawQuery);
      if (!map.has(k)) map.set(k, { label: r.rawQuery, items: [] });
      map.get(k)!.items.push(r);
    }
    return [...map.values()].sort((a, b) => b.items.length - a.items.length);
  }, [rows]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1);
  const pageRows = rows.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE);

  function download() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `응대로그_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 필터를 건드리면 1쪽으로. 3쪽을 보다 조건을 바꾸면 빈 화면이 뜬다.
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0); };

  const chip = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-colors whitespace-nowrap ${
      active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
    }`;

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

      {/* 원문 조회 권한 — 화면 상태 6종 중 '권한 없음' */}
      {stats && !stats.detailAuthorized && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 mt-0.5" aria-hidden="true">lock</span>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-sm mb-1">원문 질의가 가려져 있습니다</p>
            <p className="text-[13px] text-slate-600 mb-3">
              {stats.detailNotice ?? '관리자로 확인되지 않았습니다.'} 담당자 계정으로 다시 로그인해 주세요.
            </p>
            <button onClick={relogin} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold">
              다시 로그인
            </button>
          </div>
        </div>
      )}

      {/* ── 조건 ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative grow min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="원문·용도·지역·미충족 사유로 찾기"
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400"
            />
          </div>
          <button onClick={download} disabled={rows.length === 0}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap">
            CSV 내려받기
          </button>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {([['list', '목록'], ['grouped', '묶어보기']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                className={`px-4 py-2.5 text-sm font-bold ${view === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {([['all', '전체'], ['unmet', `미충족 ${stats?.summary.unmetCount ?? 0}`], ['success', `성공 ${stats?.summary.successCount ?? 0}`]] as const)
            .map(([id, label]) => (
              <button key={id} onClick={() => reset(setOutcome)(id)} className={chip(outcome === id)}>{label}</button>
            ))}
          <span className="w-px bg-slate-200 mx-1.5 my-1" />
          {PERIODS.map((p) => (
            <button key={p.id} onClick={() => reset(setPeriod)(p.id)} className={chip(period === p.id)}>{p.label}</button>
          ))}
          <span className="w-px bg-slate-200 mx-1.5 my-1" />
          <button onClick={() => reset(setLayer)('all')} className={chip(layer === 'all')}>모든 계층</button>
          {Object.entries(LAYER_LABEL).map(([id, label]) => (
            <button key={id} onClick={() => reset(setLayer)(id)} className={chip(layer === id)}>{label}</button>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          {rows.length}건
          {rows.length !== all.length && <span className="text-slate-400"> · 전체 {all.length}건 중</span>}
          {view === 'grouped' && <span className="text-slate-400"> · {groups.length}종류</span>}
        </p>
      </div>

      {/* ── 본문 ─────────────────────────────────────────── */}
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
        ) : view === 'grouped' ? (
          <GroupedView groups={groups} />
        ) : (
          <ListView rows={pageRows} />
        )}
      </div>

      {view === 'list' && pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button onClick={() => setPage(cur - 1)} disabled={cur === 0}
            className="px-3.5 py-2 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-600 disabled:opacity-40">
            이전
          </button>
          <span className="text-sm text-slate-500 px-2">{cur + 1} / {pages}</span>
          <button onClick={() => setPage(cur + 1)} disabled={cur >= pages - 1}
            className="px-3.5 py-2 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-600 disabled:opacity-40">
            다음
          </button>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4">
        IP·위치·브라우저 정보는 수집하지 않으며, 질의문에 섞인 연락처·이메일은 적재 단계에서 자동
        마스킹됩니다.
      </p>
    </div>
  );
}

// ── 목록 ────────────────────────────────────────────────────
function ListView({ rows }: { rows: SearchLogRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[860px]">
        <thead className="bg-slate-50 text-slate-500 text-xs">
          <tr>
            {['시각', '원문 질문', '파싱된 조건', '결과', '응답 계층', '응답'].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-bold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((log, i) => (
            <tr key={`${log.ts}-${i}`}
              className={log.outcome === 'unmet'
                ? 'border-l-4 border-l-red-500 bg-red-50/30'
                : 'border-l-4 border-l-transparent'}>
              <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                {new Date(log.ts).toLocaleString('ko-KR', {
                  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </td>
              <td className="px-4 py-3 font-medium text-slate-900 max-w-xs">{log.rawQuery}</td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {[log.parsed.purpose,
                  log.parsed.headcount ? `${log.parsed.headcount}명` : null,
                  log.parsed.region, log.parsed.whenText,
                ].filter(Boolean).join(' · ') || '—'}
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
                {LAYER_LABEL[log.answeredBy ?? ''] ?? '—'}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                {(log.latencyMs / 1000).toFixed(1)}초
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 묶어보기 ────────────────────────────────────────────────
function GroupedView({ groups }: { groups: { label: string; items: SearchLogRow[] }[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="divide-y divide-slate-100">
      {groups.map((g) => {
        const unmet = g.items.filter((i) => i.outcome === 'unmet').length;
        const last = g.items.reduce((a, b) => (a.ts > b.ts ? a : b));
        const isOpen = open === g.label;
        return (
          <div key={g.label}>
            <button
              onClick={() => setOpen(isOpen ? null : g.label)}
              className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-slate-50"
            >
              <span className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                unmet === g.items.length ? 'bg-red-100 text-red-700'
                  : unmet > 0 ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {g.items.length}
              </span>
              <div className="grow min-w-0">
                <p className="font-bold text-slate-900 truncate">{g.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {unmet > 0 ? `미충족 ${unmet}건 · ` : ''}
                  마지막 {new Date(last.ts).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            {isOpen && (
              <div className="bg-slate-50 px-5 py-3 space-y-1.5">
                {g.items.map((r, i) => (
                  <div key={`${r.ts}-${i}`} className="flex items-center gap-3 text-xs">
                    <span className="font-mono text-slate-400 w-32 shrink-0 whitespace-nowrap">
                      {new Date(r.ts).toLocaleString('ko-KR', {
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    <span className={`font-bold w-16 shrink-0 ${r.outcome === 'unmet' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {r.outcome === 'unmet' ? '미충족' : '성공'}
                    </span>
                    <span className="text-slate-500 truncate">
                      {r.outcome === 'unmet'
                        ? r.unmetType ?? '—'
                        : r.shownSpaceIds.map(spaceName).join(', ')}
                    </span>
                    <span className="text-slate-400 ml-auto shrink-0">
                      {LAYER_LABEL[r.answeredBy ?? ''] ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
