import { Link } from 'react-router';

/** 404 (PL-11) — 잘못된 주소가 빈 화면이 되지 않게 한다 */
export default function NotFound() {
  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block" aria-hidden="true">
          explore_off
        </span>
        <h1 className="text-xl font-bold text-slate-900 mb-2">없는 주소입니다</h1>
        <p className="text-sm text-slate-500 mb-6">
          주소가 바뀌었거나 잘못 입력됐어요. 찾으시는 공간은 검색으로 바로 찾을 수 있습니다.
        </p>
        <div className="flex gap-2 justify-center">
          <Link to="/" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm">
            홈으로
          </Link>
          <Link to="/spaces" className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm">
            전체 공간 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
