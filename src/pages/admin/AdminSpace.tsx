import { useState } from 'react';

const spaces = [
  { id: 'GRE-101', facility: '그린생활지원센터', name: '키친인큐베이팅(대)', category: '키친·조리', capacity: '6~12명', fee: '5,000원/h', status: '활성' },
  { id: 'HAE-201', facility: '해오름센터', name: '전시실 A', category: '전시·공연', capacity: '~100명', fee: '15,000원/h', status: '활성' },
  { id: 'NEU-101', facility: '늘봄춘양', name: '다목적 공연장', category: '전시·공연', capacity: '~100명', fee: '30,000원/h', status: '활성' },
  { id: 'NEU-303', facility: '늘봄춘양', name: '송이·약초 체험실', category: '공방·체험', capacity: '5~20명', fee: '7,000원/h', status: '활성' },
  { id: 'HAE-101', facility: '해오름센터', name: '오픈카페 내성다방', category: '카페·라운지', capacity: '~50명', fee: '무료', status: '활성' },
  { id: 'GRE-201', facility: '그린생활지원센터', name: '그린워크숍룸', category: '공방·체험', capacity: '5~20명', fee: '6,000원/h', status: '활성' },
];

export default function AdminSpace() {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="p-8 pb-20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">공간 관리</h1>
          <p className="text-slate-500 mt-1">3개 거점시설 30개 공간의 세부 정보를 관리합니다.</p>
        </div>
        <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>
          새 공간 등록
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-bold">공간 ID</th>
                <th className="px-6 py-4 font-bold">시설</th>
                <th className="px-6 py-4 font-bold">공간명</th>
                <th className="px-6 py-4 font-bold">카테고리</th>
                <th className="px-6 py-4 font-bold">수용 인원</th>
                <th className="px-6 py-4 font-bold">이용료</th>
                <th className="px-6 py-4 font-bold">상태</th>
                <th className="px-6 py-4 font-bold">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {spaces.map(space => (
                <tr key={space.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{space.id}</td>
                  <td className="px-6 py-4 text-slate-600">{space.facility}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{space.name}</td>
                  <td className="px-6 py-4 text-slate-600">{space.category}</td>
                  <td className="px-6 py-4 text-slate-600">{space.capacity}</td>
                  <td className="px-6 py-4 text-slate-600">{space.fee}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {space.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(space.id)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 rounded-lg text-xs font-bold transition-colors">편집</button>
                      <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors">복제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">공간 편집: {editingId}</h2>
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">거점시설</label>
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                    <option>그린생활지원센터</option>
                    <option>해오름센터</option>
                    <option>늘봄춘양</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">카테고리</label>
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                    <option>키친·조리</option>
                    <option>회의·교육</option>
                    <option>공방·체험</option>
                    <option>전시·공연</option>
                    <option>숙박</option>
                    <option>카페·라운지</option>
                    <option>야외</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">공간명</label>
                  <input type="text" defaultValue={spaces.find(s => s.id === editingId)?.name} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">층수</label>
                    <input type="text" defaultValue="1F" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">면적(㎡)</label>
                    <input type="number" defaultValue="90" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">최소 인원</label>
                    <input type="number" defaultValue="6" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">최대 인원</label>
                    <input type="number" defaultValue="12" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">시간당 요금(원)</label>
                  <input type="number" defaultValue="5000" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-2">장비 태그</label>
                  <input type="text" defaultValue="업소용 조리대 2조, HACCP 설비, 대형 냉장고" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-2">적합 활동 태그</label>
                  <input type="text" defaultValue="단체 김장, 발효 워크숍, 식자재 사전신청" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-2 flex justify-between">
                    <span>AI 추천용 설명</span>
                    <span className="text-emerald-500 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">auto_awesome</span> AI 프롬프트 주입용</span>
                  </label>
                  <textarea rows={3} defaultValue="대규모 식품 조리 및 김장체험 등 특별한 목적의 활동이 가능한 맞춤형 공간입니다." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"></textarea>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setEditingId(null)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">취소</button>
              <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2">
                저장 → AI에 반영
                <span className="material-symbols-outlined text-[18px]">publish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
