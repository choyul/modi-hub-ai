import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: '10월 1주', 해오름: 400, 그린: 240, 늘봄: 200 },
  { name: '10월 2주', 해오름: 300, 그린: 139, 늘봄: 221 },
  { name: '10월 3주', 해오름: 200, 그린: 980, 늘봄: 229 },
  { name: '10월 4주', 해오름: 278, 그린: 390, 늘봄: 200 },
  { name: '11월 1주', 해오름: 189, 그린: 480, 늘봄: 218 },
  { name: '11월 2주', 해오름: 239, 그린: 380, 늘봄: 250 },
  { name: '11월 3주', 해오름: 349, 그린: 430, 늘봄: 210 },
];

export default function AdminDashboard() {
  return (
    <div className="p-8 pb-20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">운영 대시보드</h1>
          <p className="text-slate-500 mt-1">시스템 이용 현황 및 주요 지표를 확인합니다.</p>
        </div>
        <button className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          최근 30일
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-emerald-600">search</span>
          </div>
          <p className="text-sm font-bold text-slate-500 mb-2">누적 AI 탐색 횟수</p>
          <div className="text-3xl font-black text-slate-900">12,408<span className="text-sm font-medium text-slate-500 ml-1">건</span></div>
          <div className="mt-4 flex items-center text-xs font-bold text-emerald-500">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span className="ml-1">+12.5% vs 지난주</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl pl-4 text-emerald-600">domain</span>
          </div>
          <p className="text-sm font-bold text-slate-500 mb-2">활성 공간 수</p>
          <div className="text-3xl font-black text-slate-900">30<span className="text-sm font-medium text-slate-500 ml-1">개</span></div>
          <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span className="ml-1">전체 정상 운영 중</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl pl-4 text-emerald-600">event_available</span>
          </div>
          <p className="text-sm font-bold text-slate-500 mb-2">예약 전환율</p>
          <div className="text-3xl font-black text-slate-900">24.1<span className="text-sm font-medium text-slate-500 ml-1">%</span></div>
          <div className="mt-4 flex items-center text-xs font-bold text-emerald-500">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span className="ml-1">+2.1% vs 지난주</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group bg-slate-900 text-white">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-white">smart_toy</span>
          </div>
          <p className="text-sm font-bold text-slate-400 mb-2">AI 응답 정확도</p>
          <div className="text-3xl font-black text-white">98.2<span className="text-sm font-medium text-slate-400 ml-1">%</span></div>
          <div className="mt-4 flex items-center text-xs font-bold text-emerald-400">
            RAG 컨텍스트 히트율 기반
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">시설별 탐색 추이</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="해오름" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="그린" stackId="a" fill="#34D399" />
                <Bar dataKey="늘봄" stackId="a" fill="#A7F3D0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">인기 검색 키워드 타임라인</h2>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            {['11.20 워크숍 관련 탐색 다수 발생', '11.18 천연염색 체험 문의 급증', '11.15 단체 김장 문의 시작', '11.10 소규모 회의실 검색 증가'].map((log, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-slate-300 group-[.is-active]:bg-emerald-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-900 text-sm">{log.split(' ')[0]}</div>
                  </div>
                  <div className="text-slate-600 text-sm">{log.split(' ').slice(1).join(' ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
