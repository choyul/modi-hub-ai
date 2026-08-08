import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import spacesData from '../../data/spaces.json';
import { getCategoryImageUrl } from './UserSpaces';
import { useAuth } from '../../contexts/AuthContext';

/**
 * 검색 결과 화면.
 *
 * LLM 호출은 /api/recommend-spaces(서버)에서만 일어난다. 이 파일에는 API 키가 없다.
 * 결과가 0건인 경우가 이 서비스의 목적 지점이므로, 빈 화면 대신
 * 실패 3겹 응답(근접 대안 → 수요 등록 동의 → 알림 통로)을 제공한다. — 과제정의서 §3-3
 */

interface MatchedSpace {
  id: string;
  matchScore: number;
  reasoning: string;
}

interface NearAlternative {
  id: string;
  gap: string;
  reasoning: string;
}

interface ParsedQuery {
  purpose: string | null;
  headcount: number | null;
  region: string | null;
  whenText: string | null;
  keywords: string[];
}

interface ApiResponse {
  parsed: ParsedQuery;
  matched: MatchedSpace[];
  nearAlternatives: NearAlternative[];
  unmetType: string | null;
  followUps: string[];
  latencyMs: number;
  persisted: boolean;
}

type SpaceInfo = (typeof spacesData.spaces)[number];

const findSpace = (id: string) =>
  spacesData.spaces.find((s) => s.id === id) as SpaceInfo | undefined;

function feeLabel(space: SpaceInfo) {
  return space.fee_per_hour
    ? `${space.fee_per_hour.toLocaleString()}원/시간`
    : space.fee_per_night
    ? `${space.fee_per_night.toLocaleString()}원/1박`
    : '무료';
}

// [원칙 2] 이유 설명 — 추천 근거를 데이터에서 구조화해 사용자가 스스로 검증하게 함
function buildGrounds(space: SpaceInfo) {
  return [
    {
      icon: 'group',
      label: '수용 인원',
      value: `${space.capacity_min}~${space.capacity_max}명`,
    },
    {
      icon: 'construction',
      label: '주요 설비',
      value: space.features.slice(0, 3).join(', '),
    },
    {
      icon: 'event_available',
      label: '이용 조건',
      value: `${feeLabel(space)} · 예약 ${space.reservation_lead_days}일 전 신청`,
    },
  ];
}

export default function UserSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  // 실패 3겹 응답 ②③ — 동의 기반 수요 등록 상태
  const [demandState, setDemandState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [contact, setContact] = useState('');
  const [wantsNotice, setWantsNotice] = useState(false);

  useEffect(() => {
    if (!query) {
      navigate('/');
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      setDemandState('idle');
      setContact('');
      setWantsNotice(false);

      try {
        const res = await fetch('/api/recommend-spaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || '검색에 실패했습니다.');
        if (!cancelled) setResult(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || '오류가 발생했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query, navigate]);

  const hasResults = !!result && result.matched.length > 0;

  async function registerDemand() {
    if (!result) return;
    setDemandState('sending');
    try {
      await fetch('/api/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawQuery: query,
          unmetType: result.unmetType,
          contact: wantsNotice ? contact : '',
        }),
      });
      setDemandState('done');
    } catch {
      // 등록 실패도 숨기지 않는다
      setDemandState('idle');
      alert('수요 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20">
      {/* Search Header */}
      <div className="bg-indigo-900 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* [원칙 3] 한계 표시 — 진행/완료 상태를 정직하게, 기다림도 설명 */}
          <div className="flex items-center gap-3 text-indigo-300 mb-4">
            <span className="material-symbols-outlined text-indigo-400">auto_awesome</span>
            <span className="font-semibold text-sm tracking-wide">
              {loading ? 'AI가 조건을 분석하고 있어요…' : 'AI 분석 완료'}
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-relaxed tracking-tight">"{query}"</h1>

          {/* 조건 파싱 결과 노출 — 과제정의서 §3-1. AI가 무엇으로 알아들었는지 보여준다 */}
          {result && (
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                result.parsed.purpose && { k: '용도', v: result.parsed.purpose },
                result.parsed.headcount && { k: '인원', v: `${result.parsed.headcount}명` },
                result.parsed.region && { k: '지역', v: result.parsed.region },
                result.parsed.whenText && { k: '시기', v: result.parsed.whenText },
              ]
                .filter(Boolean)
                .map((c: any) => (
                  <span
                    key={c.k}
                    className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[12.5px]"
                  >
                    <span className="text-indigo-300 mr-1.5">{c.k}</span>
                    {c.v}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {loading && (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-indigo-600"></div>
            <p className="text-slate-500 font-medium">
              등록된 {spacesData.spaces.length}개 공간을 검색 중입니다…
            </p>
            {/* [원칙 1·3] 기다림도 무엇을 하는지 설명 */}
            <p className="text-xs text-slate-400">
              인원·설비·예약 조건을 맞춰보고 있어요. 잠시만 기다려 주세요.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-200 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-4">error</span>
            <h2 className="text-lg font-bold mb-2">잠시 문제가 생겼어요</h2>
            <p className="text-slate-500 text-center">{error}</p>
            {/* [원칙 4] 오류도 막다른 골목이 아니라 다음 경로를 제시 */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm"
              >
                다시 시도
              </button>
              <button
                onClick={() => navigate('/spaces')}
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm"
              >
                전체 공간 둘러보기
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────
            결과 0건 = 미충족 수요. 이 서비스가 수집하려는 바로 그 지점.
            ① 근접 대안 → ② 수요 등록 동의 → ③ 알림 통로
           ─────────────────────────────────────────────── */}
        {result && !loading && !error && !hasResults && (
          <div className="space-y-4">
            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-amber-500">
                    travel_explore
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  조건에 맞는 공간이 봉화에 아직 없습니다
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                  없는 것을 있다고 안내하지 않습니다.
                  {result.unmetType && (
                    <>
                      {' '}
                      찾으신 것은 <b className="text-slate-700">{result.unmetType}</b>으로
                      기록했습니다.
                    </>
                  )}
                </p>
              </div>

              {/* ① 근접 대안 — 실제 데이터에서 고른 후보. 무엇이 모자라는지 함께 표시 */}
              {result.nearAlternatives.length > 0 && (
                <div className="mb-6">
                  <div className="text-xs font-bold text-slate-500 mb-2">
                    완전히 같지는 않지만, 가까운 공간입니다
                  </div>
                  <div className="space-y-2">
                    {result.nearAlternatives.map((alt) => {
                      const s = findSpace(alt.id);
                      if (!s) return null;
                      return (
                        <div
                          key={alt.id}
                          className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-start gap-3"
                        >
                          <span className="material-symbols-outlined text-indigo-500 mt-0.5">
                            near_me
                          </span>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-slate-800">
                              {s.name}
                              <span className="ml-2 font-normal text-slate-500 text-[12px]">
                                {s.facility} · {s.capacity_min}~{s.capacity_max}명 · {feeLabel(s)}
                              </span>
                            </div>
                            <p className="text-[13px] text-slate-600 mt-0.5">{alt.reasoning}</p>
                            {/* 한계를 숨기지 않는다 */}
                            <div className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
                              <span className="material-symbols-outlined text-[14px]">info</span>
                              다른 점 — {alt.gap}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 조건 바꿔 다시 검색 */}
              {result.followUps.length > 0 && (
                <>
                  <div className="text-xs font-bold text-slate-500 mb-2">
                    이렇게 조건을 바꿔보세요
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {result.followUps.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => navigate(`/search?q=${encodeURIComponent(s)}`)}
                        className="flex-1 text-left px-4 py-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors flex items-center justify-between group"
                      >
                        {s}
                        <span className="material-symbols-outlined text-[16px] text-slate-300 group-hover:text-indigo-500">
                          refresh
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ②③ 수요 등록 동의 + 알림 통로 — 몰래 수집이 아니라 사용자가 직접 등록 */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border-2 border-indigo-100">
              {demandState !== 'done' ? (
                <>
                  <div className="flex items-start gap-3 mb-4">
                    <span className="material-symbols-outlined text-indigo-600 mt-0.5">
                      campaign
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 mb-1">
                        이 수요를 봉화군에 전달할까요?
                      </h3>
                      <p className="text-[13px] text-slate-500 leading-relaxed">
                        찾으셨는데 없었던 공간은 도시재생팀이 다음 유휴공간 활용을 기획할 때 쓰는
                        근거가 됩니다. 전달되는 것은{' '}
                        <b className="text-slate-700">질문 내용</b>이며, 누가 검색했는지는 저장하지
                        않습니다.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={wantsNotice}
                      onChange={(e) => setWantsNotice(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span className="text-[13px] font-medium text-slate-700">
                      이런 공간이 생기면 알려주세요 (선택)
                    </span>
                  </label>

                  {wantsNotice && (
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="연락받으실 휴대폰 번호 또는 이메일"
                      className="w-full mb-3 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  )}

                  <button
                    onClick={registerDemand}
                    disabled={demandState === 'sending' || (wantsNotice && !contact.trim())}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm transition-colors"
                  >
                    {demandState === 'sending' ? '전달 중…' : '봉화군에 전달하기'}
                  </button>
                  <p className="text-[11.5px] text-slate-400 mt-2 text-center">
                    전달하지 않아도 이 화면을 그냥 닫으셔도 됩니다.
                  </p>
                </>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-600 mt-0.5">
                    check_circle
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      전달했습니다. 목소리가 사라지지 않았습니다
                    </h3>
                    <p className="text-[13px] text-slate-500 leading-relaxed">
                      {result.unmetType ? `「${result.unmetType}」` : '요청하신 조건'} 수요로
                      기록되었습니다. 같은 요청이 쌓이면 담당자 화면에 우선 검토 대상으로
                      올라갑니다.
                      {wantsNotice && contact.trim() && ' 해당 공간이 마련되면 알려드리겠습니다.'}
                    </p>
                    {result.persisted === false && (
                      <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-2 inline-block">
                        지금은 임시 저장소로 동작 중입니다 (저장소 미연결).
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────── 성공 ─────────────── */}
        {hasResults && !loading && !error && result && (
          <div className="space-y-6">
            {/* [원칙 3] 한계 표시 — 정보 기준일과 실시간 확인 필요를 정직하게 명시 */}
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-400">
                  database
                </span>
                등록된 {spacesData.spaces.length}개 공간 중에서 찾았습니다
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-400">
                  verified_user
                </span>
                실시간 예약 가능 여부는 <b className="text-slate-700 mx-1">담당자 확인</b>이
                필요해요
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-200">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">check</span>
                </span>
                가장 잘 맞는 공간이에요
              </h2>

              <div className="space-y-6">
                {(() => {
                  const rec = result.matched[0];
                  const spaceInfo = findSpace(rec.id);
                  if (!spaceInfo) return null;
                  const grounds = buildGrounds(spaceInfo);

                  return (
                    <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                      {/* [원칙 3] 확신 수치를 '적합도 + 산출 근거'로 정직하게 표현 */}
                      <div className="absolute top-4 right-4 bg-white/95 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold z-10 shadow-sm border border-indigo-100 text-right">
                        <div className="font-mono">추천 적합도 {rec.matchScore}%</div>
                        <div className="text-[9px] font-normal text-slate-400">조건 일치도</div>
                      </div>

                      <div className="md:flex">
                        <div className="md:w-1/3 bg-slate-200 h-48 md:h-auto relative overflow-hidden flex items-center justify-center">
                          <img
                            src={getCategoryImageUrl(spaceInfo.category)}
                            alt={spaceInfo.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 flex gap-1">
                            <span className="px-2 py-0.5 bg-black/50 text-white text-[10px] rounded backdrop-blur-sm">
                              {spaceInfo.facility}
                            </span>
                            <span className="px-2 py-0.5 bg-black/50 text-white text-[10px] rounded backdrop-blur-sm">
                              {spaceInfo.floor}
                            </span>
                          </div>
                        </div>

                        <div className="p-6 md:w-2/3 flex flex-col justify-between bg-white relative">
                          <div>
                            <div className="text-xs font-bold text-indigo-600 mb-1">
                              {spaceInfo.category}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">
                              {spaceInfo.name}
                            </h3>
                            <p className="text-[13px] text-slate-600 mb-3">{rec.reasoning}</p>

                            {/* [원칙 2] 이유 설명 — 근거 3종을 구조화하여 스스로 판단하게 함 */}
                            <div className="rounded-lg border border-slate-200 overflow-hidden mb-3">
                              <div className="bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-indigo-500">
                                  fact_check
                                </span>
                                이 공간을 추천한 근거
                              </div>
                              <div className="divide-y divide-slate-100">
                                {grounds.map((g) => (
                                  <div key={g.label} className="flex items-center gap-3 px-3 py-2">
                                    <span className="material-symbols-outlined text-[18px] text-slate-400">
                                      {g.icon}
                                    </span>
                                    <span className="text-[12px] text-slate-400 w-16 shrink-0">
                                      {g.label}
                                    </span>
                                    <span className="text-[13px] font-semibold text-slate-800 flex-1">
                                      {g.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mt-1 flex flex-wrap gap-1">
                              {spaceInfo.features.map((f) => (
                                <span
                                  key={f}
                                  className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] rounded-full"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* [원칙 6] 적정 신뢰 — AI는 참고용, 최종 승인은 담당자 */}
                          <div className="mt-5">
                            <div className="flex items-center gap-1.5 text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3">
                              <span className="material-symbols-outlined text-[16px] text-slate-400">
                                balance
                              </span>
                              AI 추천은 <b className="text-slate-700 mx-1">참고용</b>이며, 최종
                              예약 확정·승인은 <b className="text-slate-700 mx-1">담당자가 직접</b>
                              확인합니다.
                            </div>
                            <div className="flex items-center gap-1 text-[10.5px] text-slate-400 mb-3 font-medium">
                              <span className="text-indigo-600 font-bold">① AI 추천</span>
                              <span className="material-symbols-outlined text-[13px]">
                                chevron_right
                              </span>
                              <span>② 신청</span>
                              <span className="material-symbols-outlined text-[13px]">
                                chevron_right
                              </span>
                              <span>③ 담당자 승인</span>
                              <span className="material-symbols-outlined text-[13px]">
                                chevron_right
                              </span>
                              <span>④ 예약 확정</span>
                            </div>
                            <button
                              onClick={() => {
                                if (!isLoggedIn) {
                                  navigate('/login');
                                } else {
                                  navigate(`/reservations?apply=${spaceInfo.id}`);
                                }
                              }}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
                            >
                              예약 신청하기
                              <span className="font-normal text-indigo-200 ml-1 text-xs">
                                (담당자 승인 후 확정)
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 그 외 후보 */}
                {result.matched.length > 1 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 pt-4 border-t border-slate-100">
                      이런 공간도 고려해보세요
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.matched.slice(1).map((rec) => {
                        const spaceInfo = findSpace(rec.id);
                        if (!spaceInfo) return null;
                        return (
                          <div
                            key={rec.id}
                            className="relative border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col group hover:border-indigo-200 hover:shadow-md transition-all"
                          >
                            <div className="h-36 relative overflow-hidden bg-slate-100">
                              <img
                                src={getCategoryImageUrl(spaceInfo.category)}
                                alt={spaceInfo.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute top-2 right-2 bg-white/90 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">
                                적합도 {rec.matchScore}%
                              </div>
                              <div className="absolute bottom-2 left-2">
                                <span className="px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded backdrop-blur-sm">
                                  {spaceInfo.facility}
                                </span>
                              </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                              <div className="text-[10px] font-bold text-indigo-600 mb-1">
                                {spaceInfo.category}
                              </div>
                              <h4 className="text-md font-bold text-slate-900 mb-2">
                                {spaceInfo.name}
                              </h4>
                              <p className="text-xs text-slate-600 mb-3 line-clamp-3 bg-slate-50 p-2 rounded flex-1">
                                <span className="font-semibold text-indigo-600 mr-1">
                                  추천 이유:
                                </span>
                                {rec.reasoning}
                              </p>
                              <div className="mt-auto pt-3 border-t border-slate-100 text-xs text-slate-500">
                                {spaceInfo.capacity_min}~{spaceInfo.capacity_max}명 ·{' '}
                                {spaceInfo.reservation_lead_days}일 전 예약
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* [원칙 5] 주도권 — 조건 변경 재검색 */}
            {result.followUps.length > 0 && (
              <div className="bg-slate-100 p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-slate-500 mb-4 px-2">
                  조건을 바꿔 다시 찾아볼까요?
                </h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  {result.followUps.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate(`/search?q=${encodeURIComponent(suggestion)}`)}
                      className="flex-1 text-left px-5 py-3 bg-white hover:bg-indigo-50 rounded-xl shadow-sm text-sm font-medium text-slate-700 transition-colors flex items-center justify-between group"
                    >
                      {suggestion}
                      <span className="material-symbols-outlined text-[16px] text-slate-300 group-hover:text-indigo-500 transition-colors">
                        arrow_outward
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
