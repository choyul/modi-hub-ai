import { useState } from 'react';

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState('interest');

  return (
    <div className="p-8 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">분석 리포트</h1>
        <p className="text-slate-500 mt-1">공간 이용 및 검색 키워드 분석 리포트입니다.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200 mb-8">
        {[
          { id: 'interest', label: '🏢 공간별 관심도' },
          { id: 'query', label: '💬 질의 유형' },
          { id: 'profile', label: '👥 관심사 프로필' },
          { id: 'unmet', label: '⚠️ 미충족 수요' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-emerald-500 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'interest' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6">공간별 문의 건수 TOP 10</h3>
              <div className="space-y-4">
                {[
                  { name: '키친인큐베이팅(대)', count: 42, max: 45 },
                  { name: '송이약초체험실', count: 28, max: 45 },
                  { name: '다목적공연장', count: 21, max: 45 },
                  { name: '세미나실', count: 19, max: 45 },
                  { name: '그린워크숍룸', count: 15, max: 45 },
                  { name: '게스트하우스가족실', count: 13, max: 45 },
                  { name: '전시실 A', count: 11, max: 45 },
                  { name: '오픈카페', count: 10, max: 45 },
                  { name: '코워킹', count: 8, max: 45 },
                  { name: '키친소', count: 7, max: 45 },
                ].map(item => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-32 text-xs font-medium text-slate-600 truncate text-right">{item.name}</div>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(item.count/item.max)*100}%` }}></div>
                    </div>
                    <div className="w-8 text-xs font-bold text-slate-800 text-right">{item.count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6">추천→이용 전환율</h3>
              <div className="flex h-64 gap-4 items-end pb-6 border-b border-slate-100">
                {[
                  { name: '키친대', val: 82 },
                  { name: '송이체험', val: 71 },
                  { name: '공연장', val: 58 },
                  { name: '세미나실', val: 64 },
                  { name: '워크숍룸', val: 60 },
                  { name: '가족실', val: 78 }
                ].map(item => (
                  <div key={item.name} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs font-bold text-slate-600">{item.val}%</div>
                    <div className={`w-full rounded-t-sm ${item.val >= 70 ? 'bg-emerald-400' : 'bg-orange-400'}`} style={{ height: `${item.val}%` }}></div>
                    <div className="text-[10px] text-slate-500 w-full text-center truncate px-1">{item.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
            <h3 className="font-bold text-slate-800 mb-6">시간대별 응대 집중도</h3>
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="w-16"></th>
                  {['월','화','수','목','금','토','일'].map(d=><th key={d} className="py-2 text-xs font-bold text-slate-500 bg-slate-50 rounded">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {['09시','11시','13시','15시','17시','19시'].map((t, i) => (
                  <tr key={t}>
                    <td className="text-xs font-medium text-slate-500 text-right pr-4">{t}</td>
                    {[0,1,2,3,4,5,6].map(j => {
                      const intensity = Math.abs(Math.sin((i+1)*(j+1))) * 100;
                      return (
                        <td key={j} className="h-10 rounded shadow-sm" style={{ backgroundColor: `rgba(16, 185, 129, ${intensity/100})` }}></td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'unmet' && (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <h2 className="text-xl font-bold text-red-700 tracking-tight">총 24건 미충족 수요 식별</h2>
            </div>
            <button className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-bold shadow-sm hover:bg-red-50">상세내역 다운로드</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">현재 시설로 응대 불가능한 다빈도 요청 TOP 5</h3>
              <ul className="space-y-3">
                {[
                  { req: '야간 회의/모임 가능 공간', cnt: 8 },
                  { req: '반려동물 동반 가능 공간', cnt: 5 },
                  { req: '30명 이상 단체 식사', cnt: 4 },
                  { req: '장기 임대 월 단위', cnt: 4 },
                  { req: '농산물 직판 플리마켓', cnt: 3 },
                ].map(item => (
                  <li key={item.req} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border-l-4 border-l-red-400">
                    <span className="font-medium text-slate-800 text-sm">{item.req}</span>
                    <span className="font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full text-xs">{item.cnt}건</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm border-l-4 border-l-emerald-500">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-xl">lightbulb</span>
                데이터 기반 시설 확장 권고
              </h3>
              <div className="space-y-4">
                {[
                  { tag: '운영시간 연장', desc: '해오름센터 1층 일부 공간을 야간 무인 개방 공간으로 전환 검토', arrow: '주민 소모임 활성화 기대' },
                  { tag: '정책 수정', desc: '야외 옥상정원 및 야외 시설에 한해 반려동물 동반 가이드라인 수립', arrow: '신규 타겟층 확보' },
                  { tag: '공간 재배치', desc: '그린생활지원센터 야외 테라스를 연계하여 단체 식사존 임시 구성', arrow: '단체 워크숍 유치율 상승' }
                ].map((item, i) => (
                  <div key={i} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">{item.tag}</span>
                    </div>
                    <div className="font-bold text-slate-800 text-sm mb-2">{item.desc}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                      <span className="material-symbols-outlined text-emerald-400 text-[14px]">arrow_forward</span>
                      {item.arrow}
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm">검토 시작</button>
                      <button className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-bold rounded-lg">보류</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {['query', 'profile'].includes(activeTab) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">construction</span>
          <p>해당 분석 뷰는 준비 중입니다.</p>
        </div>
      )}
    </div>
  );
}
