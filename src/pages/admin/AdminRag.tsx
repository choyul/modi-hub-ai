import { useState } from 'react';

const rags = [
  { id: 'GRE-101', name: '키친인큐베이팅(대)', lastEdit: '11.18 13:30', aiSync: '11.18 13:42', status: 'AI가 알고 있음', ok: true },
  { id: 'HAE-201', name: '전시실 A', lastEdit: '11.18 11:20', aiSync: '11.18 13:42', status: 'AI가 알고 있음', ok: true },
  { id: 'NEU-303', name: '송이약초체험실', lastEdit: '11.18 14:55', aiSync: '11.18 13:42', status: '새 정보 미반영', ok: false },
  { id: 'NEU-101', name: '다목적공연장', lastEdit: '11.17 16:00', aiSync: '11.18 13:42', status: 'AI가 알고 있음', ok: true },
  { id: 'HAE-101', name: '오픈카페', lastEdit: '11.15 09:00', aiSync: '11.18 13:42', status: 'AI가 알고 있음', ok: true },
];

export default function AdminRag() {
  const [isSyncing, setIsSyncing] = useState(false);

  return (
    <div className="p-8 pb-20 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">AI 안내 상태 점검</h1>
        <p className="text-slate-500 mt-1">공간 정보 데이터를 RAG 컨텍스트로 동기화합니다.</p>
      </div>

      <div className="bg-emerald-50 border-l-4 border-l-emerald-500 border-y border-r border-emerald-100 rounded-r-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
            <span className="material-symbols-outlined text-2xl">check</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">주민이 받는 안내가 모두 최신 정보로 작동 중입니다</h2>
            <div className="text-sm text-slate-500">
              마지막 업데이트 2026.11.18 13:42 · 30개 공간 정보 모두 반영됨 · AI 응답 속도 1.2초
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="px-4 py-2 bg-white border border-emerald-200 text-emerald-700 text-sm font-bold rounded-lg shadow-sm hover:bg-emerald-100 transition-colors">변경된 정보만 반영</button>
          <button className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">sync</span> 전체 다시 반영
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative">
          <div className="absolute top-4 right-4 bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">이번 달 사용료: 1,700원</div>
          <h3 className="font-bold text-slate-800 mb-4">이번 달 AI 사용 현황</h3>
          <div className="h-40 bg-slate-50 rounded-xl flex items-end justify-between px-4 pb-2 border border-slate-100">
            {[40, 60, 45, 80, 50, 90, 70].map((val, i) => (
              <div key={i} className="w-8 bg-emerald-400 rounded-t-sm" style={{ height: `${val}%` }}></div>
            ))}
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">AI 작동 상태</h3>
          <div className="grid grid-cols-2 gap-4 h-40">
            <div className="bg-slate-50 rounded-xl p-4 flex flex-col justify-center">
              <div className="text-xs text-slate-500 mb-1">AI 응답 속도</div>
              <div className="text-xl font-black text-slate-800">1.2초</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 flex flex-col justify-center">
              <div className="text-xs text-slate-500 mb-1">정상 작동 비율</div>
              <div className="text-xl font-black text-emerald-600">99.8%</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 flex flex-col justify-center">
              <div className="text-xs text-slate-500 mb-1">이번 달 AI 안내</div>
              <div className="text-xl font-black text-slate-800">412건</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 flex flex-col justify-center">
              <div className="text-xs text-slate-500 mb-1">공간 정보 저장 용량</div>
              <div className="text-xl font-black text-slate-800">1.2MB</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <h3 className="px-6 py-4 font-bold text-slate-800 border-b border-slate-100 bg-slate-50">공간별 정보 반영 상태</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-slate-200 text-slate-500 text-xs">
              <tr>
                <th className="px-6 py-3 font-bold">공간 ID</th>
                <th className="px-6 py-3 font-bold">공간명</th>
                <th className="px-6 py-3 font-bold">정보 마지막 수정</th>
                <th className="px-6 py-3 font-bold">AI에 반영된 시각</th>
                <th className="px-6 py-3 font-bold">반영 상태</th>
                <th className="px-6 py-3 font-bold text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rags.map((rag, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{rag.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{rag.name}</td>
                  <td className="px-6 py-4 text-slate-600">{rag.lastEdit}</td>
                  <td className="px-6 py-4 text-slate-600">{rag.aiSync}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${rag.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${rag.ok ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                      {rag.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {rag.ok ? (
                      <button className="text-xs font-bold text-slate-400 hover:text-slate-600">다시 반영</button>
                    ) : (
                      <button className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">지금 반영하기</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-6">최근 작업 내역</h3>
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:w-0.5 before:bg-slate-100">
          {[
            { time: '11.18 13:42', msg: '전체 RAG 벡터스토어 리빌드 완료', ok: true },
            { time: '11.18 13:40', msg: '관리자(조율)가 강제 동기화 트리거', ok: true },
            { time: '11.18 11:20', msg: '전시실 A 정보 수정에 따른 자동 반영 실패 (API 타임아웃)', ok: false },
            { time: '11.15 09:05', msg: '오픈카페 면적 정보 부분 업데이트 완료', ok: true },
            { time: '11.15 09:00', msg: '새 공간(오픈카페) 등록 - RAG 인덱싱 대기 추가', ok: true }
          ].map((log, i) => (
            <div key={i} className="relative flex items-start gap-4 pl-8 group">
              <div className={`absolute left-0 mt-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${log.ok ? 'bg-emerald-400' : 'bg-orange-400'}`}></div>
              <div>
                <div className="text-xs font-bold text-slate-500 mb-0.5">{log.time}</div>
                <div className={`text-sm ${log.ok ? 'text-slate-700' : 'text-orange-700 font-medium'}`}>{log.msg}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
