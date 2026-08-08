import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import spacesData from '../../data/spaces.json';

/**
 * 첫 화면.
 *
 * UX 점검 반영 사항
 * - G1 기대 설정: 할 수 있는 것 / 담당자 확인이 필요한 것을 첫 화면에 명시
 * - G10 대안 경로: 검색 외에 예시 질문·카테고리 둘러보기 두 갈래를 둔다.
 *   예시 질문은 누르면 검색어만 채우지 않고 바로 실행한다(한 번 더 누르게 하지 않는다).
 * - 접근성: h1 도입, 검색 입력에 label 연결, 아이콘 전용 버튼에 aria-label
 * - 정직성: 실사용자가 아직 없으므로 이용 후기·프로그램 일정을 지어내지 않는다.
 *   대신 실제 적재된 검색 집계를 보여준다. 0건이면 0건이라고 쓴다.
 */

const EXAMPLES = [
  '부녀회 8명이서 김장할 넓은 주방',
  '15명 워크숍 할 공간',
  '송이철에 가족이 1박할 곳',
  '밤 9시 이후에도 쓸 수 있는 작업실',
];

interface PublicSummary {
  totalSearches: number;
  unmetCount: number;
  registeredDemands: number;
}

export default function UserHome() {
  const [query, setQuery] = useState('');
  const [summary, setSummary] = useState<PublicSummary | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 집계 수치는 공개 값이다. 실패해도 화면은 그대로 동작해야 하므로 조용히 넘어간다.
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSummary(d.summary))
      .catch(() => {});
  }, []);

  const runSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 w-full">
      <div className="max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* 검색 */}
        <section className="md:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-center min-h-[320px]">
          <p className="text-xs font-bold text-indigo-500 uppercase mb-2">봉화군 공간 찾기</p>
          <h1 className="text-2xl font-bold mb-3 text-slate-900 tracking-tight">
            어떤 활동을 계획하고 계신가요?
          </h1>
          <p className="text-sm text-slate-500 mb-4">
            봉화에 어떤 공간이 있는지 일상적인 말로 물어보세요. 없으면 없다고 알려드립니다.
          </p>

          <form onSubmit={handleSearch} className="w-full relative">
            <label htmlFor="space-query" className="sr-only">
              찾으시는 공간을 입력하세요
            </label>
            <input
              id="space-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 pr-16 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-lg transition-all"
              placeholder="예: 부녀회 8명이서 김장체험 할 만한 공간 있을까요?"
            />
            <button
              type="submit"
              aria-label="검색"
              className="absolute right-3 top-3 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <span className="material-symbols-outlined shrink-0 text-xl leading-none" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </form>

          {/* G10 대안 경로 ① — 누르면 바로 검색된다 */}
          <div className="mt-4">
            <p className="text-[11px] font-bold text-slate-400 mb-2">이렇게 물어보셔도 됩니다</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => runSearch(ex)}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* G1 기대 설정 */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start gap-2 mb-3">
              <span className="material-symbols-outlined text-[18px] text-indigo-500 mt-0.5" aria-hidden="true">
                lightbulb
              </span>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                조건에 맞는 <b className="text-slate-800">공간을 찾아</b> 드립니다. 실제{' '}
                <b className="text-slate-800">예약 확정은 담당자 확인 후</b> 완료됩니다.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 mb-1.5">
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                    check_circle
                  </span>
                  지금 할 수 있어요
                </p>
                <ul className="text-[11.5px] text-slate-500 space-y-0.5 leading-snug">
                  <li>· 목적·인원에 맞는 공간 찾기</li>
                  <li>· 추천 근거(수용인원·설비·이용료) 확인</li>
                  <li>· 대관 신청 접수</li>
                </ul>
              </div>
              <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1.5">
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                    schedule
                  </span>
                  아직 못 해요
                </p>
                <ul className="text-[11.5px] text-slate-500 space-y-0.5 leading-snug">
                  <li>· 실시간 예약 확정·결제·환불</li>
                  <li>· 봉화 밖 시군 공간 검색</li>
                  <li>· 민원 접수·인허가 상담</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* G10 대안 경로 ② — 검색이 유일한 진입로가 되지 않게 */}
        <section className="md:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col min-h-[320px]">
          <h2 className="text-sm font-bold text-slate-800 mb-1">그냥 둘러보기</h2>
          <p className="text-[11.5px] text-slate-400 mb-4">
            무엇을 찾을지 아직 모르겠다면 유형부터 보세요
          </p>
          <div className="grid grid-cols-2 gap-2 flex-1 content-start">
            {spacesData._meta.categories.map((cat) => (
              <Link
                key={cat}
                to={`/spaces?category=${encodeURIComponent(cat)}`}
                className="py-3 px-2 bg-slate-50 rounded-xl text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-center border border-slate-100 flex items-center justify-center min-h-[44px]"
              >
                {cat}
              </Link>
            ))}
          </div>
          <Link
            to="/spaces"
            className="mt-4 text-center py-2.5 text-sm font-bold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            {spacesData.spaces.length}개 공간 전체 보기
          </Link>
        </section>

        {/* 실제 집계. 지어낸 후기·일정 대신 진짜 숫자를 쓴다 */}
        <section className="md:col-span-12 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            봉화에서 지금 무엇을 찾고 있나
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            이 서비스는 검색이 실패한 순간을 기록합니다. 찾았는데 없었던 공간이 다음 유휴공간
            활용의 근거가 됩니다.
          </p>

          {summary && summary.totalSearches > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: '지금까지 검색', value: summary.totalSearches, unit: '건' },
                { label: '봉화에 없던 요청', value: summary.unmetCount, unit: '건' },
                { label: '주민이 직접 등록한 수요', value: summary.registeredDemands, unit: '건' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-black text-slate-900">
                    {s.value}
                    <span className="text-sm font-medium text-slate-500 ml-1">{s.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">
              아직 쌓인 검색 기록이 없습니다. 이 자리에는 실제 검색 집계만 표시하며, 예시 수치를
              대신 넣지 않습니다.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
