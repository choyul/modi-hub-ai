import { useState } from 'react';

const logs = [
  { id: 1, time: '14:32', mode: '주민', query: '"부녀회 8명 김장체험..."', intent: '김장체험·8명·단체', status: '✅ 예약 전환', space: '키친인큐베이팅(대)', perf: '응답 1.2초 ⭐⭐⭐', alert: false },
  { id: 2, time: '14:18', mode: '주민', query: '"송이 시즌 가족 1박..."', intent: '송이체험·가족·1박', status: '✅ 예약 전환', space: '송이체험실+가족실', perf: '응답 1.4초 ⭐⭐⭐', alert: false },
  { id: 3, time: '13:45', mode: '주민', query: '"청년 창업 코워킹..."', intent: '코워킹·창업', status: '🔍 매칭 후 이탈', space: '코워킹 사무공간', perf: '응답 1.1초 ⭐⭐', alert: false },
  { id: 4, time: '13:21', mode: '조합원', query: '"15명 워크숍 공간..."', intent: '워크숍·15명', status: '✅ 예약 전환', space: '세미나실', perf: '응답 0.9초 ⭐⭐⭐', alert: false },
  { id: 5, time: '12:58', mode: '주민', query: '"밤 9시 이후 회의할 곳..."', intent: '야간·회의', status: '❌ 완전 미충족', space: '사유: 야간 운영 시설 없음', perf: '응답 1.3초 —', alert: true },
  { id: 6, time: '11:42', mode: '주민', query: '"반려견 동반 카페..."', intent: '반려동물·카페', status: '❌ 완전 미충족', space: '사유: 반려동물 정책 부재', perf: '응답 1.2초 —', alert: true },
];

export default function AdminLog() {
  const [selectedId, setSelectedId] = useState<number | null>(1);

  return (
    <div className="p-8 pb-20 flex flex-col h-screen overflow-hidden max-h-screen box-border">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">응대 로그</h1>
        <p className="text-slate-500 mt-1">AI의 대화 내역 및 추천 결과를 모니터링합니다.</p>
      </div>

      <div className="flex gap-4 mb-6 shrink-0">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
          <input type="text" placeholder="키워드, 의도 검색..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <select className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 outline-none"><option>최근 7일</option></select>
        <select className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 outline-none"><option>모든 시설</option></select>
        <select className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 outline-none"><option>전체 모드</option></select>
        <select className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 outline-none"><option>전체 결과</option></select>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-6 shrink-0">
        <h3 className="text-orange-800 font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">push_pin</span>
          오늘 확인이 필요한 항목 3건
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
            <div className="text-xs font-bold text-red-600 mb-1">🚨 완전 미충족 2건</div>
            <div className="font-medium text-slate-800 text-sm">야간 운영 시설 없음 <span className="text-slate-400 font-normal">(3회 반복)</span></div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
            <div className="text-xs font-bold text-red-600 mb-1">🚨 완전 미충족 1건</div>
            <div className="font-medium text-slate-800 text-sm">반려동물 정책 부재 <span className="text-slate-400 font-normal">(5회 반복)</span></div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
            <div className="text-xs font-bold text-amber-600 mb-1">⚠️ 예약 전환율 저조</div>
            <div className="font-medium text-slate-800 text-sm">단체 식사 30명 64% <span className="text-slate-400 font-normal">(평균 -8%p)</span></div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-bold pl-6">시각/모드</th>
                  <th className="px-4 py-3 font-bold">질문</th>
                  <th className="px-4 py-3 font-bold">결과</th>
                  <th className="px-4 py-3 font-bold">응대품질</th>
                  <th className="px-4 py-3 font-bold text-right pr-6">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedId(log.id)}
                    className={`cursor-pointer transition-colors ${selectedId === log.id ? 'bg-emerald-50' : 'hover:bg-slate-50'} ${log.alert ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}`}
                  >
                    <td className="px-4 py-4 pl-6">
                      <div className="font-mono text-slate-500 text-xs mb-1">{log.time}</div>
                      <div className="text-xs font-bold text-slate-700">{log.mode}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900 mb-1 truncate max-w-[200px]">{log.query}</div>
                      <div className="text-xs text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded">{log.intent}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`font-bold mb-1 ${log.status.includes('✅') ? 'text-emerald-600' : log.status.includes('❌') ? 'text-red-500' : 'text-slate-600'}`}>{log.status}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[150px]">{log.space}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600 text-xs">{log.perf}</td>
                    <td className="px-4 py-4 pr-6 text-right">
                      <button className="text-emerald-600 hover:text-emerald-700 font-bold text-xs flex items-center justify-end gap-1 w-full relative">
                        상세보기
                        {log.alert && <span className="material-symbols-outlined text-[16px] text-red-500 ml-1">push_pin</span>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedId ? (
          <div className="w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-800 flex justify-between items-center shrink-0">
              대화 상세 정보
              <div className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">ID: #{logs.find(l=>l.id===selectedId)?.id}</div>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">채팅 원문</h4>
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="bg-emerald-600 text-white p-3 rounded-2xl rounded-tr-sm text-sm max-w-[85%] shadow-sm">
                      부녀회 8명 김장체험 할 공간을 찾아줘.
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-800 p-3 rounded-2xl rounded-tl-sm text-sm max-w-[85%]">
                      네, 부녀회 8명 김장체험을 위한 공간으로 <b>그린생활지원센터의 키친인큐베이팅(대)</b>를 추천해 드립니다. 조리대 2조와 HACCP 설비가 있어 김장에 적합합니다.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">의도 분석 결과</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500 mr-2">목적:</span><span className="font-bold">김장체험</span></div>
                  <div><span className="text-slate-500 mr-2">인원:</span><span className="font-bold">8명 (단체)</span></div>
                  <div><span className="text-slate-500 mr-2">유형:</span><span className="font-bold">주민 커뮤니티</span></div>
                  <div><span className="text-slate-500 mr-2">특수:</span><span className="font-bold">조리 설비 필요</span></div>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <p>발생 시각: 2024.11.20 14:32:15</p>
                <p>응답 소요 시간: 1.25s</p>
                <p>최종 행동: 예약 폼 진입 성공</p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">운영자 메모</h4>
                <textarea className="w-full h-24 p-3 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 resize-none" placeholder="이 대화에 대한 메모를 남겨주세요..."></textarea>
                <button className="w-full mt-2 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors">저장하기</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-1/3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <span className="material-symbols-outlined text-4xl mb-2">chat</span>
            <p className="text-sm">테이블에서 행을 선택하면<br/>상세 내역이 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
