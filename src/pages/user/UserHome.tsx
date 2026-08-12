import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import SpaceBrowser from '../../components/SpaceBrowser';

/**
 * 첫 화면 — 「무엇을 하려는지 묻고, 바로 아래에 공간을 펼친다」.
 *
 * 홈과 공간안내를 합쳤다. 나눠 두면 검색을 못 떠올린 사람이 한 번 더 눌러
 * 이동해야 했는데, 그럴 이유가 없다. 위에서 물어보고 아래에 답(공간 목록)을
 * 두면 스크롤만으로 이어진다.
 *
 * 검색 집계('봉화에서 무엇을 찾고 있나')는 담당자 화면으로 옮겼다 —
 * 이용자에게는 공간을 빌리는 데 쓸모가 없는 숫자다.
 */
const EXAMPLES = [
  '부녀회 8명이서 김장할 넓은 주방',
  '15명 워크숍 할 공간',
  '송이철에 가족이 1박할 곳',
  '조용히 노트북 들고 일할 곳',
];

export default function UserHome() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const runSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 w-full">
      {/* 물어보기 */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto w-full px-6 py-12 md:py-16">
          <p className="text-xs font-bold text-indigo-500 uppercase mb-2">봉화군 공간 찾기</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-slate-900 tracking-tight">
            어떤 활동을 계획하고 계신가요?
          </h1>
          <p className="text-sm text-slate-500 mb-5">
            일상적인 말로 물어보시면 알맞은 공간을 찾아 드립니다.
          </p>

          <form onSubmit={handleSearch} className="w-full relative max-w-3xl">
            <label htmlFor="space-query" className="sr-only">
              찾으시는 공간을 입력하세요
            </label>
            <input
              id="space-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 pr-16 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-lg transition-all"
              placeholder="예: 부녀회 8명이서 김장체험 할 만한 공간 있을까요?"
            />
            <button
              type="submit"
              aria-label="검색"
              className="absolute right-3 top-3 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <span className="material-symbols-outlined shrink-0 text-xl leading-none" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </form>

          {/* 누르면 바로 검색된다 — 한 번 더 누르게 하지 않는다 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => runSearch(ex)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 바로 아래에 공간 목록 — 검색이 유일한 진입로가 되지 않게 */}
      <div className="max-w-7xl mx-auto w-full px-6 py-10">
        <h2 className="text-xl font-bold text-slate-900 mb-1">공간 둘러보기</h2>
        <p className="text-sm text-slate-500 mb-5">
          찾으시는 것이 떠오르지 않으면 아래에서 직접 골라 보세요.
        </p>
        <SpaceBrowser />
      </div>
    </div>
  );
}
