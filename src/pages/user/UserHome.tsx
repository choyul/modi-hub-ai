import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router';

export default function UserHome() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 w-full">
      {/* Top Section */}
      <div className="max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* AI Space Search */}
        <section className="md:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-center min-h-[320px]">
          <label className="text-xs font-bold text-indigo-500 uppercase mb-2">AI 지능형 공간 검색</label>
          <h2 className="text-2xl font-bold mb-4 text-slate-900 tracking-tight">어떤 활동을 계획하고 계신가요?</h2>
          <p className="text-sm text-slate-500 mb-4 hidden md:block">
            봉화에서 함께할 최상의 공간을 찾아드립니다. 누구와, 무엇을, 언제 — 편하게 물어보세요.
          </p>

          <form onSubmit={handleSearch} className="w-full relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 pr-16 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-lg transition-all"
              placeholder="예: 부녀회 8명이서 김장체험 할 만한 공간 있을까요?"
            />
            <button 
              type="submit" 
              className="absolute right-3 top-3 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white p-2 rounded-lg"
            >
              <span className="material-symbols-outlined shrink-0 text-xl leading-none">arrow_forward</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-2 mt-4">
            {[
              "단체 김장체험 8명",
              "15명 워크숍",
              "송이축제 가족 1박",
              "조용히 책 읽을 곳"
            ].map((tag, idx) => {
              const bgColors = ["bg-indigo-50 text-indigo-700 border-indigo-100", "bg-emerald-50 text-emerald-700 border-emerald-100", "bg-amber-50 text-amber-700 border-amber-100", "bg-sky-50 text-sky-700 border-sky-100"];
              return (
                <button 
                  key={tag} 
                  onClick={() => setQuery(tag)}
                  className={`text-xs px-2.5 py-1 rounded border ${bgColors[idx % bgColors.length]} font-medium transition-transform hover:scale-105`}
                >
                  #{tag.split(' ').join('')}
                </button>
              );
            })}
          </div>
        </section>

        {/* Recommended Categories */}
        <section className="md:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-center min-h-[320px]">
          <h4 className="text-sm font-bold text-slate-800 mb-4">주요 카테고리</h4>
          <div className="grid grid-cols-2 gap-2">
            {["키친·조리", "회의·교육", "공방·체험", "전시·공연", "숙박", "카페·라운지"].map(cat => (
              <button key={cat} onClick={() => setQuery(cat)} className="py-3 px-2 bg-slate-50 rounded-xl text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-center border border-slate-100 h-full flex items-center justify-center">
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* AI Insight Feature */}
        <section className="md:col-span-12 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6 items-center">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-amber-50 rounded-xl flex-shrink-0 flex flex-col items-center justify-center border border-amber-100">
            <span className="material-symbols-outlined text-4xl md:text-5xl text-amber-500 mb-1" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
            <span className="text-[9px] md:text-[10px] font-bold text-amber-600 uppercase">AI Recommendation</span>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider">AI Insight</span>
              <h4 className="text-lg font-bold text-slate-800">모디Hub 지능형 매칭 엔진</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mt-2 hidden md:block">
              검색창에 원하시는 목적과 인원을 입력하시면, 봉화군 3개 거점시설 내 위치한 다양한 공간의 상세 조건(수용인원, 설비, 비용 등)을 AI가 실시간으로 분석하여 <b className="text-indigo-600 px-1 font-semibold">가장 적합한 공간</b>을 매칭 및 추천해 드립니다.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mt-2 md:hidden">
              목적과 인원만 입력하면 AI가 가장 적합한 공간을 맞춤 추천합니다. 지금 바로 상단의 검색창에서 확인해보세요.
            </p>
            <div className="mt-5 flex items-center justify-center md:justify-start gap-4">
              <div className="flex gap-4 text-[11px] text-slate-500 font-medium font-mono">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">bolt</span> FAST</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">tune</span> PRECISE</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">map</span> 30+ SPACES</span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Section 1: 최근 이용 후기 */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-16">
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">봉화 사람들이 다녀간 자리</h2>
          <p className="text-slate-500 mt-2 text-base md:text-lg">실제 이용자들의 이야기</p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Featured Card */}
          <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col md:flex-row">
            <div className="md:w-1/2 relative min-h-[240px] md:min-h-[340px]">
              <img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80" alt="Kitchen" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                그린생활지원센터 · 키친인큐베이팅
              </div>
            </div>
            <div className="md:w-1/2 p-6 md:p-12 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full self-start mb-4 tracking-wide">FEATURED · 2026년 11월</span>
              <h3 className="text-xl md:text-3xl font-bold text-slate-900 mb-6 leading-snug">올해 김장을 8명이 한자리에서, 처음입니다</h3>
              <blockquote className="border-l-[3px] border-emerald-400 pl-4 py-0.5 mb-8">
                <p className="text-slate-600 italic leading-relaxed md:text-lg">"지난 5년간 따로따로 김장하던 부녀회원들이 한 곳에 모였어요. 내년에도 꼭 같은 자리에서 하기로 약속했습니다."</p>
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm shrink-0">박</div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">박정희 (52세)</div>
                  <div className="text-xs text-slate-500">내성지구 부녀회 / 발효 워크숍 운영</div>
                </div>
              </div>
            </div>
          </div>

          {/* Small Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden group hover:-translate-y-1 transition-transform duration-300 flex flex-col">
              <div className="w-full h-48 relative overflow-hidden shrink-0">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80" alt="Gallery" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-bold text-slate-700 shadow-sm border border-slate-100/50">
                  해오름센터 · 전시실 B
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h4 className="text-lg font-bold text-slate-900 mb-2 leading-snug">첫 개인전, 진입장벽이 낮았습니다</h4>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">"귀촌 3년차 도예작가가 신진작가 전시실에서 첫 개인전을 열었습니다."</p>
                <div className="text-xs font-bold text-slate-500 mt-auto">김민영 (47세) · 도예작가</div>
              </div>
            </div>

            <div className="bg-white rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden group hover:-translate-y-1 transition-transform duration-300 flex flex-col">
              <div className="w-full h-48 relative overflow-hidden shrink-0">
                <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80" alt="Mushroom" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-bold text-slate-700 shadow-sm border border-slate-100/50">
                  늘봄춘양 · 송이체험실
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h4 className="text-lg font-bold text-slate-900 mb-2 leading-snug">송이 시즌, 외지 가족과 함께한 1박</h4>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">"서울에서 온 손주들과 송이채취 체험 후 게스트하우스 가족실에서 1박."</p>
                <div className="text-xs font-bold text-slate-500 mt-auto">정순희 (68세) · 춘양면 거주</div>
              </div>
            </div>

            <div className="bg-white rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden group hover:-translate-y-1 transition-transform duration-300 flex flex-col">
              <div className="w-full h-48 relative overflow-hidden shrink-0">
                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80" alt="Working" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-bold text-slate-700 shadow-sm border border-slate-100/50">
                  해오름센터 · 코워킹
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h4 className="text-lg font-bold text-slate-900 mb-2 leading-snug">봉화에서 원격근무가 가능해졌어요</h4>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">"풀리모트 스타트업에서 일하며 봉화로 귀촌. 코워킹 부스에 입주했습니다."</p>
                <div className="text-xs font-bold text-slate-500 mt-auto">이준호 (34세) · 청년 창업가</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: 이번 달 열리는 프로그램 */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-16 mb-12">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">이번 달 함께할 수 있어요</h2>
            <p className="text-slate-500 mt-2 text-base md:text-lg">새로운 배움과 만남의 기회</p>
          </div>
          <a href="#" className="hidden md:flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors group">
            전체 보기 <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
          </a>
        </div>

        <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory">
          {[
            {
              date: '11.23 (토)', title: '봉화 약초 천연염색 워크숍', loc: '그린생활지원센터 · 그린워크숍룸', max: 15, left: 3,
              status: '신청 가능', type: 'mint'
            },
            {
              date: '11.30 (토)', title: '귀촌인을 위한 발효식품 만들기', loc: '그린생활지원센터 · 키친인큐베이팅', max: 10, left: 1,
              status: '마감 임박', type: 'orange'
            },
            {
              date: '12.07 (토)', title: '봉화 로컬 크리에이터 네트워킹', loc: '해오름센터 · 옥상정원', max: 40, left: 22,
              status: '신청 가능', type: 'mint'
            },
            {
              date: '12.14 (토)', title: '송이·약초 비누 만들기 체험', loc: '늘봄춘양 · 송이약초 체험실', max: 20, left: 8,
              status: '신청 가능', type: 'mint'
            }
          ].map((prog, idx) => (
            <div key={idx} className="bg-white rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 p-6 min-w-[280px] md:min-w-[320px] snap-start shrink-0 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-5">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${prog.type === 'mint' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                    {prog.date}
                  </span>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wide ${prog.type === 'mint' ? 'text-emerald-600 bg-emerald-50/50' : 'text-orange-600 bg-orange-50/50'}`}>
                    {prog.status}
                  </span>
                </div>
                <h4 className="text-[17px] font-bold text-slate-900 mb-2.5 truncate" title={prog.title}>{prog.title}</h4>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-2.5 truncate">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  {prog.loc}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-7">
                  <span className="material-symbols-outlined text-[16px]">group</span>
                  최대 {prog.max}명 <span className="mx-1.5 text-slate-200">|</span> <span className="font-bold text-slate-700">잔여 {prog.left}석</span>
                </div>
              </div>
              <button className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl transition-colors min-h-[44px]">
                신청하기
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
