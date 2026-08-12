import { useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import spacesData from '../../data/spaces.json';
import { capacityLabel, feeLabel, isIncomplete, bookingOf, type Space } from '../../lib/space';
import SpacePhoto from '../../components/SpacePhoto';

/**
 * 공간 목록 (SP-02·SP-07) — 「공간안내」와 「조건조회」를 합친 화면.
 *
 * 원래 두 화면이었다. 주민용 카드 목록(/spaces)과 공무원용 조건 필터(/filter).
 * 그런데 둘 다 같은 11건을 같은 방식(정적 필터)으로 보여주고, 둘 다 AI를 쓰지
 * 않는다. 다른 것은 필터가 1개냐 3개냐, 카드냐 표냐뿐이었다. 이용자에게는
 * 구분할 이유가 없는 메뉴가 둘 있는 셈이라 합쳤다.
 *
 * 공무원(O)에게 필요한 것은 별도 화면이 아니라 ① 조건을 여러 개 걸기와
 * ② 여러 건을 나란히 비교하기였다. 필터 3종과 표 보기로 그 둘을 여기서 채운다.
 *
 * 이 화면은 AI 를 쓰지 않는다 — 런타임 4계층 중 ① 조건필터만으로 동작하며
 * LLM·외부 연결이 전부 끊겨도 살아 있다.
 */
export default function UserSpaces() {
  // 조건을 URL 에 둔다 — 담당자가 필터 건 화면을 그대로 링크로 공유할 수 있다
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const category = params.get('category') || 'all';
  const facility = params.get('facility') || 'all';
  const headcount = params.get('headcount') || '';
  const sort = params.get('sort') || 'default';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all' || value === 'default') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const facilities = useMemo(
    () => [...new Set(spacesData.spaces.map((s) => s.facility))], []
  );

  const rows = useMemo(() => {
    const n = parseInt(headcount, 10);
    const list = spacesData.spaces
      .filter((s) => category === 'all' || s.category === category)
      .filter((s) => facility === 'all' || s.facility === facility)
      // 인원 조건은 '확인된 수용인원'이 있는 곳만 판단한다. 값이 없는 곳을
      // 조용히 떨어뜨리면 "없다"로 읽히므로, 모르는 곳은 남겨 두고 표시로 알린다.
      .filter((s) => !Number.isFinite(n) || s.capacity_max == null || s.capacity_max >= n);

    // 정렬. 수용인원이 '확인 필요'(null)인 곳은 어느 방향으로 정렬하든 맨 뒤로
    // 보낸다 — 값이 없는 것을 '가장 작다/크다'로 취급하면 오해를 준다.
    const capAsc = (a: Space, b: Space) => (a.capacity_max ?? Infinity) - (b.capacity_max ?? Infinity);
    const sorted = [...list];
    if (sort === 'cap_asc') sorted.sort(capAsc);
    else if (sort === 'cap_desc') sorted.sort((a, b) =>
      (b.capacity_max ?? -Infinity) - (a.capacity_max ?? -Infinity));
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    // default 는 등록(계획서) 순서 그대로 둔다
    return sorted;
  }, [category, facility, headcount, sort]);

  const filtered = category !== 'all' || facility !== 'all' || headcount !== '';

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">공간 안내</h1>
          <p className="text-slate-500 mt-2">
            봉화군에 등록된 {spacesData.spaces.length}개 공간입니다. 조건으로 좁혀 볼 수 있습니다.
          </p>

          {/* 데이터 출처를 화면에 그대로 쓴다 — 어디까지가 확인된 정보인지 이용자가 알아야 한다 */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12.5px] text-slate-600 leading-relaxed">
            <span className="material-symbols-outlined text-[15px] text-slate-400 align-middle mr-1" aria-hidden="true">
              info
            </span>
            준공(2026.11.29) 전 계획 단계로, 표시된 값은 계획 기준입니다.
            아직 확정되지 않은 항목은 「확인 필요」로 안내합니다.
            <span className="block mt-1 text-slate-400">
              이 화면은 AI를 사용하지 않고 등록된 정보를 조건으로 보여드립니다.
            </span>
          </div>
        </div>

        {/* 조건 — 용도·시설·인원 (구 「조건조회」가 하던 일) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500">용도</span>
            <select
              value={category} onChange={(e) => setParam('category', e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none min-w-[140px]"
            >
              <option value="all">전체 용도</option>
              {spacesData._meta.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500">시설</span>
            <select
              value={facility} onChange={(e) => setParam('facility', e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none min-w-[160px]"
            >
              <option value="all">전체 시설</option>
              {facilities.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-500">이용 인원</span>
            <input
              type="number" min={1} value={headcount} placeholder="예: 8"
              onChange={(e) => setParam('headcount', e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none w-28"
            />
          </label>

          {filtered && (
            <button
              onClick={() => setParams(sort === 'default' ? {} : { sort }, { replace: true })}
              className="px-3 py-2 text-sm font-bold text-slate-500 hover:text-slate-800"
            >
              조건 지우기
            </button>
          )}

          {/* 정렬 */}
          <label className="flex flex-col gap-1 ml-auto">
            <span className="text-[11px] font-bold text-slate-500">정렬</span>
            <select
              value={sort} onChange={(e) => setParam('sort', e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none min-w-[150px]"
            >
              <option value="default">추천순 (등록 순서)</option>
              <option value="cap_asc">수용 인원 적은 순</option>
              <option value="cap_desc">수용 인원 많은 순</option>
              <option value="name">이름순 (가나다)</option>
            </select>
          </label>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          {rows.length}건 · 「확인 필요」는 아직 확정되지 않아 비워 둔 항목입니다.
        </p>

        {/* 0건 상태 */}
        {rows.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block" aria-hidden="true">
              search_off
            </span>
            <h2 className="font-bold text-slate-800 mb-1">조건에 맞는 공간이 없습니다</h2>
            <p className="text-sm text-slate-500 mb-5">
              봉화에 이런 공간이 없다는 뜻입니다. 검색으로 알려 주세요 — 없는 공간을 찾은
              기록이 다음 유휴공간 활용의 근거가 됩니다.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setParams({}, { replace: true })}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm"
              >
                조건 지우고 전체 보기
              </button>
              <button
                onClick={() => navigate(`/search?q=${encodeURIComponent(
                  `${category === 'all' ? '' : category + ' '}공간을 찾고 있어요`)}`)}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm"
              >
                검색으로 알려 주기
              </button>
            </div>
          </div>
        )}

        {/* 카드 목록 */}
        {rows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rows.map((space) => (
              <div key={space.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col">
                <div className="h-48 relative overflow-hidden bg-slate-100">
                  <SpacePhoto category={space.category} className="w-full h-full" />
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <span className="px-2 py-1 bg-black/60 text-white text-[10px] rounded font-medium backdrop-blur-sm shadow-sm">{space.facility}</span>
                    {isIncomplete(space as Space) && (
                      <span className="px-2 py-1 bg-amber-500/90 text-white text-[10px] rounded font-bold backdrop-blur-sm shadow-sm">정보 확인 필요</span>
                    )}
                    {bookingOf(space as Space).channel === 'ota' && (
                      <span className="px-2 py-1 bg-indigo-600/90 text-white text-[10px] rounded font-bold backdrop-blur-sm shadow-sm">외부 예약</span>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3 text-white">
                    <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-[10px] rounded font-medium shadow-sm">{space.floor}</span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-indigo-600 mb-1">{space.category}</div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{space.name}</h3>
                    <div className="text-sm text-slate-500 mb-4 line-clamp-2">{space.specialty}</div>
                  </div>
                  <div>
                    <div className="flex gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-lg mb-4">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-slate-400" aria-hidden="true">group</span>
                        {capacityLabel(space as Space)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-slate-400" aria-hidden="true">monetization_on</span>
                        {feeLabel(space as Space)}
                      </div>
                    </div>
                    <Link
                      to={`/spaces/${space.id}`}
                      className="block text-center w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      상세보기
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
