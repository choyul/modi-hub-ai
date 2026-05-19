import { Navigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

export default function UserReservations() {
  const { isLoggedIn } = useAuth();
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const dummyReservations = [
    {
      id: "REV-241120-001",
      spaceName: "세미나실 A",
      facility: "해오름센터",
      date: "2024-11-25 14:00~16:00",
      status: "예약확정",
      headcount: 20,
      purpose: "주민협의체 월례회의"
    },
    {
      id: "REV-241118-042",
      spaceName: "키친인큐베이팅 (대)",
      facility: "그린생활지원센터",
      date: "2024-11-28 10:00~14:00",
      status: "승인대기",
      headcount: 12,
      purpose: "부녀회 김장행사"
    },
    {
      id: "REV-241110-015",
      spaceName: "게스트하우스 가족실",
      facility: "늘봄춘양",
      date: "2024-12-05 15:00 ~ 12-06 11:00",
      status: "예약확정",
      headcount: 4,
      purpose: "가족 여행 숙박"
    }
  ];

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">예약 현황</h1>
          <p className="text-slate-500 mt-2">고객님의 온라인 예약 신청 내역입니다.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {dummyReservations.map(rev => (
              <li key={rev.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-[11px] font-bold rounded ${
                        rev.status === '예약확정' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {rev.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{rev.id}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{rev.spaceName}</h3>
                    <div className="text-sm text-slate-600 mb-3">{rev.facility}</div>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_month</span>
                        {rev.date}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">group</span>
                        {rev.headcount}명
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white bg-slate-50 transition-colors">
                      상세보기
                    </button>
                    {rev.status === '승인대기' && (
                      <button className="flex-1 sm:flex-none px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-bold transition-colors">
                        취소요청
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
