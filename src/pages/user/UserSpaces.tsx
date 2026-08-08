import { useSearchParams, useNavigate } from 'react-router';
import spacesData from '../../data/spaces.json';
import { capacityLabel, feeLabel, isIncomplete, type Space } from '../../lib/space';

export const getCategoryImageUrl = (category: string) => {
  switch (category) {
    case '회의·교육': return 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=400';
    case '키친·조리': return 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400';
    case '공방·체험': return 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=400';
    case '전시·공연': return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';
    case '숙박': return 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400';
    case '카페·라운지': return 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400';
    case '야외': return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';
    default: return 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400';
  }
};

export default function UserSpaces() {
  // 홈에서 /spaces?category=... 로 들어오는 경로를 받는다 (G10 대안 경로)
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedCategory = searchParams.get('category') || 'all';

  const setSelectedCategory = (cat: string) => {
    setSearchParams(cat === 'all' ? {} : { category: cat }, { replace: true });
  };

  const filteredSpaces =
    selectedCategory === 'all'
      ? spacesData.spaces
      : spacesData.spaces.filter((s) => s.category === selectedCategory);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">공간 안내</h1>
          <p className="text-slate-500 mt-2">
            봉화군에 등록된 {spacesData.spaces.length}개 공간입니다.
          </p>

          {/* 데이터 출처를 화면에 그대로 쓴다 — 어디까지가 확인된 정보인지 이용자가 알아야 한다 */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12.5px] text-slate-600 leading-relaxed">
            <span className="material-symbols-outlined text-[15px] text-slate-400 align-middle mr-1">
              info
            </span>
            MODI 3개 거점시설은 <b>준공(2026.12) 전 계획값</b>이며 실측 확인 전입니다. 농업가공교육관
            요리실습장처럼 <b>소관 부서가 다른 시설</b>은 이용 조건이 아직 확인되지 않아 「정보 확인
            필요」로 표시합니다. 확인되지 않은 값을 임의로 채우지 않습니다.
          </div>
        </div>
        
        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            전체보기 ({spacesData.spaces.length})
          </button>
          {spacesData._meta.categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 0건 상태 — 화면 상태 6종 중 빠져 있던 항목 */}
        {filteredSpaces.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block" aria-hidden="true">
              search_off
            </span>
            <h2 className="font-bold text-slate-800 mb-1">
              「{selectedCategory}」 유형으로 등록된 공간이 아직 없습니다
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              봉화에 이 유형의 공간이 없다는 뜻입니다. 필요하시면 검색으로 알려 주세요 — 없는
              공간을 찾은 기록이 다음 유휴공간 활용의 근거가 됩니다.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm"
              >
                전체 공간 보기
              </button>
              <button
                onClick={() => navigate(`/search?q=${encodeURIComponent(selectedCategory + ' 공간을 찾고 있어요')}`)}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm"
              >
                이 유형으로 검색해 보기
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSpaces.map(space => (
            <div key={space.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col">
              <div className="h-48 relative overflow-hidden bg-slate-100">
                <img src={getCategoryImageUrl(space.category)} alt={space.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 flex flex-col gap-1">
                  <span className="px-2 py-1 bg-black/60 text-white text-[10px] rounded font-medium backdrop-blur-sm shadow-sm">{space.facility}</span>
                  {isIncomplete(space as Space) && (
                    <span className="px-2 py-1 bg-amber-500/90 text-white text-[10px] rounded font-bold backdrop-blur-sm shadow-sm">정보 확인 필요</span>
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
                      <span className="material-symbols-outlined text-[16px] text-slate-400">group</span>
                      {capacityLabel(space as Space)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">monetization_on</span>
                      {feeLabel(space as Space)}
                    </div>
                  </div>
                  <button className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-colors">
                    상세보기
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
