import { useState } from 'react';
import spacesData from '../../data/spaces.json';
import { useStats } from '../../hooks/useStats';
import { StorageBadge, Panel, BarList, EmptyState } from '../../components/AdminShared';

/**
 * 분석 리포트.
 *
 * 기본 탭을 "미충족 수요"로 둔다. 이 서비스가 수집하려는 것이 그것이기 때문이다.
 * 어떤 수치도 상수로 적어두지 않는다 — 값이 없으면 없다고 표시한다.
 */

const spaceName = (id: string) => spacesData.spaces.find((s) => s.id === id)?.name || id;

type TabId = 'unmet' | 'demand' | 'feedback' | 'interest' | 'reservation';

export default function AdminAnalytics() {
  const [tab, setTab] = useState<TabId>('unmet');
  const { stats, loading, error, reload } = useStats();

  if (loading) return <div className="p-8 text-slate-400 text-sm">집계를 불러오는 중…</div>;
  if (error || !stats) {
    return (
      <div className="p-8">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center">
          <p className="font-bold text-slate-800 mb-2">집계를 불러오지 못했습니다</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button
            onClick={reload}
            className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const s = stats.summary;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'unmet', label: `⚠️ 미충족 수요 ${s.unmetCount}` },
    { id: 'demand', label: `📮 등록된 수요 ${s.registeredDemands}` },
    { id: 'feedback', label: `👎 이탈 신호 ${s.feedbackCount}` },
    { id: 'interest', label: '🏢 공간별 관심도' },
    { id: 'reservation', label: `📋 대관 신청 ${s.reservationCount}` },
  ];

  return (
    <div className="p-8 pb-20">
      <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">분석 리포트</h1>
          <p className="text-slate-500 mt-1">
            검색 로그 {s.totalSearches}건에서 계산한 값입니다. 표본이 적으면 적은 대로 표시합니다.
          </p>
        </div>
        <StorageBadge persisted={stats.persisted} />
      </div>

      <div className="flex gap-4 border-b border-slate-200 mb-8 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'unmet' && (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-red-700 tracking-tight mb-1">
              미충족 수요 {s.unmetCount}건 식별
            </h2>
            <p className="text-sm text-red-900/70">
              전체 검색 {s.totalSearches}건 중 {s.unmetRate}%. 찾았는데 없었던 요청이므로, 봉화에
              지금 무엇이 부족한지를 직접 가리킵니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel
              title="현재 시설로 응대 불가능한 요청 유형"
              subtitle="결과 0건 검색을 AI가 시설 유형으로 분류한 결과"
              accent="red"
            >
              <BarList
                items={stats.unmetTypes}
                color="red"
                emptyTitle="아직 미충족 수요가 없습니다"
                emptyDesc="결과 0건 검색이 발생하는 즉시 자동으로 쌓입니다."
              />
            </Panel>

            <Panel
              title="지역 조건이 붙은 검색"
              subtitle="봉화 밖을 찾는 수요가 실제로 있는지 확인하는 값"
            >
              <BarList
                items={stats.regions}
                emptyTitle="지역을 지정한 검색이 아직 없습니다"
                emptyDesc="인접 시군 데이터 확보 여부를 판단하는 근거가 됩니다."
              />
            </Panel>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[13px] text-slate-600 leading-relaxed">
            <b className="text-slate-800">이 화면을 어떻게 쓰는가</b> — 같은 유형이 반복해서 쌓이면
            그 유형이 다음 유휴재산 활용 검토 대상입니다. 여기 나오는 수치는 담당자의 직관이 아니라
            주민이 실제로 검색창에 친 문장에서 나온 값입니다.
          </div>
        </div>
      )}

      {tab === 'demand' && (
        <Panel
          title="주민이 직접 등록한 수요"
          subtitle="검색이 실패한 뒤 '봉화군에 전달하기'에 동의한 건만 — 몰래 수집한 로그가 아닙니다"
          accent="emerald"
        >
          {stats.demands.length === 0 ? (
            <EmptyState
              icon="campaign"
              title={
                stats.detailAuthorized
                  ? '아직 등록된 수요가 없습니다'
                  : '담당자 토큰이 있어야 열람할 수 있습니다'
              }
              desc={
                stats.detailAuthorized
                  ? `동의 기반 등록은 ${s.registeredDemands}건입니다.`
                  : '담당자 로그인에서 토큰을 다시 입력해 주세요.'
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.demands.map((d, i) => (
                <li key={i} className="py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[11px] font-bold rounded">
                      {d.unmetType || '유형 미상'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(d.ts).toLocaleDateString('ko-KR')}
                    </span>
                    {d.contact && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[11px] font-bold rounded">
                        알림 요청
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800">{d.rawQuery}</p>
                  {d.contact && (
                    <p className="text-xs text-slate-500 mt-1">연락처: {d.contact}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel
            title="추천이 맞지 않은 이유"
            subtitle="검색은 성공했지만 사용자가 쓰지 않기로 한 지점"
          >
            <BarList
              items={stats.feedbackReasons}
              emptyTitle="아직 접수된 피드백이 없습니다"
              emptyDesc="결과 화면에서 사유를 한 번 누르면 여기에 쌓입니다."
            />
          </Panel>
          <Panel title="원문과 함께 보기" subtitle="어떤 검색에서 나온 신호인가">
            {stats.feedback.length === 0 ? (
              <EmptyState
                icon="thumb_down"
                title={
                  stats.detailAuthorized
                    ? '아직 접수된 피드백이 없습니다'
                    : '담당자 토큰이 있어야 열람할 수 있습니다'
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {stats.feedback.map((f, i) => (
                  <li key={i} className="py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded">
                        {f.spaceId ? spaceName(f.spaceId) : '공간 미상'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(f.ts).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800">{f.rawQuery}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === 'interest' && (
        <Panel title="검색에서 후보로 제시된 공간" subtitle="성공 검색 기준 노출 횟수">
          <BarList
            items={stats.topShownSpaces}
            labelMap={spaceName}
            emptyTitle="아직 노출 기록이 없습니다"
            emptyDesc="검색이 성공하면 제시된 공간이 여기에 집계됩니다."
          />
        </Panel>
      )}

      {tab === 'reservation' && (
        <Panel
          title="대관 신청"
          subtitle={`접수 ${s.reservationCount}건 · 승인대기 ${s.pendingReservations}건 — 확정은 담당자가 별도로 처리합니다`}
        >
          {stats.reservations.length === 0 ? (
            <EmptyState
              icon="event_note"
              title={
                stats.detailAuthorized
                  ? '접수된 신청이 없습니다'
                  : '담당자 토큰이 있어야 열람할 수 있습니다'
              }
              desc={
                stats.detailAuthorized
                  ? undefined
                  : '담당자 로그인에서 토큰을 다시 입력해 주세요.'
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.reservations.map((r) => (
                <li key={r.id} className="py-4 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-bold rounded">
                    {r.status}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{r.id}</span>
                  <span className="font-bold text-slate-900 text-sm">{spaceName(r.spaceId)}</span>
                  <span className="text-sm text-slate-500">
                    {r.useDate} · {r.headcount}명 · {r.purpose}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">{r.applicant}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
