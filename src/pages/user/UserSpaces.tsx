import { useState } from 'react';
import spacesData from '../../data/spaces.json';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const filteredSpaces = selectedCategory === 'all' 
    ? spacesData.spaces 
    : spacesData.spaces.filter(s => s.category === selectedCategory);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">공간 안내</h1>
          <p className="text-slate-500 mt-2">모디Hub 3개 거점시설의 전체 공간을 확인해보세요.</p>
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

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSpaces.map(space => (
            <div key={space.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col">
              <div className="h-48 relative overflow-hidden bg-slate-100">
                <img src={getCategoryImageUrl(space.category)} alt={space.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 flex flex-col gap-1">
                  <span className="px-2 py-1 bg-black/60 text-white text-[10px] rounded font-medium backdrop-blur-sm shadow-sm">{space.facility}</span>
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
                      {space.capacity_max}명
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">monetization_on</span>
                      {space.fee_per_hour ? `${space.fee_per_hour.toLocaleString()}원/h` : space.fee_per_night ? `${space.fee_per_night.toLocaleString()}원/밤` : '무료'}
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
