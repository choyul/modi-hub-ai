import { Link } from 'react-router';
import spacesData from '../../data/spaces.json';
import { useStats } from '../../hooks/useStats';
import { StorageBadge, Panel, BarList, EmptyState } from '../../components/AdminShared';

/**
 * 운영 대시보드.
 * 모든 수치는 /api/stats 가 실제 적재된 검색 로그에서 그 자리에서 계산한 값이다.
 * 로그가 0건이면 0건이라고 표시한다.
 */

const spaceName = (id: string) => spacesData.spaces.find((s) => s.id === id)?.name || id;

function Kpi({
  label,
  value,
  unit,
  note,
  tone,
}: {
  label: string;
  value: number | string;
  unit?: string;
  note?: string;
  tone?: 'red' | 'dark';
}) {
  const base =
    tone === 'dark'
      ? 'bg-slate-900 text-white border-slate-900'
      : 'bg-white border-slate-200 text-slate-900';
  return (
    <div className={`p-6 rounded-2xl border shadow-sm ${base}`}>
      <p
        className={`text-sm font-bold mb-2 ${tone === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
      >
        {label}
      </p>
      <div
        className={`text-3xl font-black ${tone === 'red' ? 'text-red-600' : ''}`}
      >
        {value}
        {unit && (
          <span className="text-sm font-medium text-slate-500 ml-1">{unit}</span>
        )}
      </div>
      {note && (
        <div
          className={`mt-4 text-xs font-bold ${
            tone === 'dark' ? 'text-slate-400' : 'text-slate-400'
          }`}
        >
          {note}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { stats, loading, error, reload } = useStats();

  if (loading) {
    return <div className="p-8 text-slate-400 text-sm">집계를 불러오는 중…</div>;
  }
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

  return (
    <div className="p-8 pb-20">
      <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">운영 대시보드</h1>
          <p className="text-slate-500 mt-1">
            적재된 검색 로그 {s.totalSearches}건을 그 자리에서 집계한 값입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StorageBadge persisted={stats.persisted} />
          <button
            onClick={reload}
            className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            새로고침
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Kpi label="누적 검색" value={s.totalSearches} unit="건" note={`성공 ${s.successCount}건`} />
        <Kpi
          label="미충족 수요"
          value={s.unmetCount}
          unit="건"
          note={`전체 검색의 ${s.unmetRate}%`}
          tone="red"
        />
        <Kpi
          label="주민이 직접 등록한 수요"
          value={s.registeredDemands}
          unit="건"
          note={`알림 신청 ${s.contactLeft}건`}
        />
        <Kpi
          label="대관 신청"
          value={s.reservationCount}
          unit="건"
          note={`승인대기 ${s.pendingReservations}건 · 개관 대기자 ${s.notifyWaiters}명`}
          tone="dark"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title="없는 시설 유형 TOP 10"
          subtitle="결과 0건이었던 검색을 유형으로 묶은 값 — 다음 유휴공간 활용 기획의 근거"
          accent="red"
        >
          <BarList
            items={stats.unmetTypes}
            color="red"
            emptyTitle="아직 미충족 수요가 없습니다"
            emptyDesc="결과 0건 검색이 발생하면 여기에 자동으로 쌓입니다."
          />
          {stats.unmetTypes.length > 0 && (
            <Link
              to="/admin/analytics"
              className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-red-600 hover:underline"
            >
              미충족 수요 상세 보기
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          )}
        </Panel>

        <Panel title="검색에 많이 노출된 공간" subtitle="성공 검색에서 후보로 제시된 횟수 (관심도)">
          <BarList
            items={stats.topShownSpaces}
            labelMap={spaceName}
            emptyTitle="아직 노출 기록이 없습니다"
            emptyDesc="검색이 성공하면 제시된 공간이 여기에 집계됩니다."
          />
        </Panel>

        <Panel title="지역 조건이 붙은 검색" subtitle="질의문에서 지역이 언급된 경우만 집계">
          <BarList
            items={stats.regions}
            emptyTitle="지역을 지정한 검색이 아직 없습니다"
            emptyDesc='"봉화에 없으면 영주는?" 같은 질문이 들어오면 여기에 쌓입니다.'
          />
        </Panel>

        <Panel
          title="추천이 맞지 않았다는 신호"
          subtitle="성공 검색인데도 사용자가 남긴 이탈 사유 — 왜 안 쓰게 되는가"
        >
          <BarList
            items={stats.feedbackReasons}
            emptyTitle="아직 접수된 피드백이 없습니다"
            emptyDesc="검색 결과 화면의 '이 추천이 맞지 않나요?'에서 들어옵니다."
          />
        </Panel>

        <Panel
          title="어느 계층이 답했나 (단계적 축퇴 실측)"
          subtitle={`검색 ${s.totalSearches}건 중 ${s.noLlmCount}건(${s.noLlmRate}%)을 생성형 AI 없이 응답 — 비용 구조의 증거`}
          accent="emerald"
        >
          <BarList
            items={stats.answeredBy}
            emptyTitle="아직 검색 기록이 없습니다"
            emptyDesc="검색이 발생하면 계층별 응답 분포가 여기 쌓입니다."
          />
        </Panel>

        <Panel title="응답 성능" subtitle="검색 1건당 응답까지 걸린 시간">
          {s.totalSearches === 0 ? (
            <EmptyState icon="speed" title="측정된 검색이 없습니다" />
          ) : (
            <div>
              <div className="text-3xl font-black text-slate-900">
                {(s.avgLatencyMs / 1000).toFixed(1)}
                <span className="text-sm font-medium text-slate-500 ml-1">초 (평균)</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {s.totalSearches}건 기준. 추정치가 아니라 실제 측정값입니다.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
