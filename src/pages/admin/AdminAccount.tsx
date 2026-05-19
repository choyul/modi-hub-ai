export default function AdminAccount() {
  const users = [
    { name: '조율', badge: '본인', type: '관리자', group: '도시재생팀', last: '방금 전', status: '활성', isMe: true },
    { name: '김민서 주무관', type: '운영자', group: '도시재생팀', last: '2시간 전', status: '활성', isMe: false },
    { name: '박순자 조합원', type: '조합원', group: '마을관리사협(해오름)', last: '어제 17:30', status: '활성', isMe: false },
    { name: '이영희 조합원', type: '조합원', group: '마을관리사협(그린생활)', last: '2일 전', status: '활성', isMe: false },
  ];

  return (
    <div className="p-8 pb-20 max-w-5xl">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">계정 관리</h1>
          <p className="text-slate-500 mt-1">관리자 계정, 역할별 권한 및 보안 설정을 관리합니다.</p>
        </div>
        <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          새 사용자 초대
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <h3 className="px-6 py-4 font-bold text-slate-800 border-b border-slate-100 bg-slate-50">사용자 목록</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-slate-200 text-slate-500 text-xs">
              <tr>
                <th className="px-6 py-3 font-bold">이름</th>
                <th className="px-6 py-3 font-bold">역할</th>
                <th className="px-6 py-3 font-bold">소속</th>
                <th className="px-6 py-3 font-bold">최근 접속</th>
                <th className="px-6 py-3 font-bold">상태</th>
                <th className="px-6 py-3 font-bold text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{user.name}</span>
                      {user.badge && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded font-bold">{user.badge}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      user.type === '관리자' ? 'bg-amber-100 text-amber-700' :
                      user.type === '운영자' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {user.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.group}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{user.last}</td>
                  <td className="px-6 py-4 text-emerald-600 font-bold text-xs">{user.status}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline">편집</button>
                      {!user.isMe && <button className="text-xs font-bold text-slate-400 hover:text-red-500 hover:underline">비활성화</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <h3 className="px-6 py-4 font-bold text-slate-800 border-b border-slate-100 bg-slate-50">권한 매트릭스</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm">
            <thead className="bg-white border-b border-slate-200 text-slate-500 text-xs">
              <tr>
                <th className="px-4 py-3 font-bold text-left">기능 / 메뉴</th>
                <th className="px-4 py-3 font-bold text-amber-700 bg-amber-50 rounded-t-lg">관리자</th>
                <th className="px-4 py-3 font-bold text-blue-700 bg-blue-50 rounded-t-lg">운영자</th>
                <th className="px-4 py-3 font-bold text-orange-700 bg-orange-50 rounded-t-lg">조합원</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { name: '대시보드 조회', a: '✓', o: '✓', c: '✓' },
                { name: '공간 등록/수정', a: '✓', o: '✓', c: '본인 시설만' },
                { name: '공간 삭제', a: '✓', o: '—', c: '—' },
                { name: '응대 로그 조회', a: '✓', o: '✓', c: '본인 시설만' },
                { name: '분석 리포트', a: '✓', o: '✓', c: '—' },
                { name: '계정 권한 관리', a: '✓', o: '—', c: '—' },
                { name: 'AI 정보 재반영', a: '✓', o: '변경분만', c: '—' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700 text-left pl-6">{row.name}</td>
                  <td className="px-4 py-3 bg-amber-50/30 text-emerald-600 font-bold">{row.a === '✓' ? <span className="material-symbols-outlined text-[18px]">check</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 bg-blue-50/30 text-slate-600">
                    {row.o === '✓' ? <span className="material-symbols-outlined text-[18px] text-emerald-600">check</span> : row.o === '—' ? <span className="text-slate-300">—</span> : <span className="text-orange-500 text-[11px] font-bold">{row.o}</span>}
                  </td>
                  <td className="px-4 py-3 bg-orange-50/30 text-slate-600">
                    {row.c === '✓' ? <span className="material-symbols-outlined text-[18px] text-emerald-600">check</span> : row.c === '—' ? <span className="text-slate-300">—</span> : <span className="text-orange-500 text-[11px] font-bold">{row.c}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <h3 className="px-6 py-4 font-bold text-slate-800 border-b border-slate-100 bg-slate-50">보안 설정</h3>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: '2단계 인증 (2FA)', desc: '로그인 시 모바일 OTP 인증을 요구합니다.', on: true },
            { title: '세션 자동 종료', desc: '60분 이상 활동이 없으면 자동 접속 종료.', on: true },
            { title: '접속 IP 제한', desc: '허용된 사무실 IP 대역에서만 접속 가능.', on: false },
            { title: '비밀번호 정기 변경', desc: '90일마다 비밀번호 변경을 강제합니다.', on: true }
          ].map((sec, i) => (
            <div key={i} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl bg-slate-50/50">
              <div>
                <div className="font-bold text-slate-800 text-sm mb-1">{sec.title}</div>
                <div className="text-xs text-slate-500">{sec.desc}</div>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${sec.on ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${sec.on ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
