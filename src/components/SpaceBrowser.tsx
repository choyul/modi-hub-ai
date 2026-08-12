import { useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import spacesData from '../data/spaces.json';
import { capacityLabel, feeLabel, isIncomplete, bookingOf, type Space } from '../lib/space';
import SpacePhoto from './SpacePhoto';

/**
 * 공간 목록 + 조건 필터 (SP-02·SP-07).
 *
 * 홈(/)과 공간안내(/spaces) 두 곳에서 같은 목록을 쓴다. 홈은 "무엇을 하려는지"
 * 물어본 바로 아래에 이 목록을 붙여, 답을 못 떠올린 사람도 스크롤만으로
 * 공간을 볼 수 있게 한다 — 검색이 유일한 진입로가 되지 않도록.
 *
 * 조건은 URL 에 둔다. 필터를 건 화면을 그대로 링크로 공유할 수 있다.
 */
export default function SpaceBrowser() {
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
      // 수용인원이 확인되지 않은 곳은 조용히 떨어뜨리지 않고 남긴다.
      // 값이 없는 것을 "안 맞는다"로 처리하면 '없다'로 읽힌다.
      .filter((s) => !Number.isFinite(n) || s.capacity_max == null || s.capacity_max >= n);

    const sorted = [...list];
    if (sort === 'cap_asc') {
      sorted.sort((a, b) => (a.capacity_max ?? Infinity) - (b.capacity_max ?? Infinity));
    } else if (sort === 'cap_desc') {
      sorted.sort((a, b) => (b.capacity_max ?? -Infinity) - (a.capacity_max ?? -Infinity));
    } else if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }
    return sorted;
  }, [category, facility, headcount, sort]);

  const filtered = category !== 'all' || facility !== 'all' || headcount !== '';

  return (
    <>
      {/* 조건 — 용도·시설·인원 + 정렬 */}
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

      <p className="text-xs text-slate-400 mb-6">전체 {rows.length}개 공간</p>

      {rows.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block" aria-hidden="true">
            search_off
          </span>
          <h2 className="font-bold text-slate-800 mb-1">조건에 맞는 공간이 없습니다</h2>
          <p className="text-sm text-slate-500 mb-5">조건을 바꾸거나 검색으로 찾아보세요.</p>
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
              검색으로 찾아보기
            </button>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rows.map((space) => (
            <div key={space.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col">
              <div className="h-48 relative overflow-hidden bg-slate-100">
                <SpacePhoto category={space.category} spaceId={space.id} className="w-full h-full" />
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
                    예약하기
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
