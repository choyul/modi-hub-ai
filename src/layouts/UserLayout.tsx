import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * 주민 화면 공통 레이아웃.
 * - PL-12: 좁은 화면에서 내비가 통째로 사라지던 결함 → 햄버거 메뉴
 * - PL-09: 푸터의 허위 상태 표시("Gemini 1.5 Flash Connected") 제거
 */

/**
 * 메뉴는 지금 누를 수 있는 것만 둔다.
 * - 「홈」은 좌측 로고가 그 역할을 하므로 메뉴로 두지 않는다 (중복).
 *   그 결과 로그인 전에는 상단 메뉴가 비고, 로고와 로그인 버튼만 남는다.
 * - 「공간안내」는 홈 아래에 그대로 들어갔으므로 별도 메뉴를 두지 않는다
 *   (/spaces 주소 자체는 살아 있다 — 카테고리 링크·기존 북마크용)
 * - 「예약현황」은 로그인해야 볼 수 있는 화면이므로 로그인 전에는 감춘다.
 *   눌러도 로그인 화면으로 튕기는 메뉴를 보여줄 이유가 없다.
 * - 「담당자」는 주민 메뉴가 아니라 내부 진입로이므로 헤더에서 빼 푸터로 내렸다.
 */
const NAV_AUTHED = [{ to: '/reservations', label: '예약현황' }];

export default function UserLayout() {
  const location = useLocation();
  const { isLoggedIn, userName, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 경로가 바뀌면 모바일 메뉴를 닫는다
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
    navigate('/');
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans">
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-4 h-20">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto h-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">M</div>
            <div>
              <h1 className="text-lg font-bold leading-none text-slate-800">MODI Hub</h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">내 주변 공간 찾기</p>
            </div>
          </Link>

          <div className="flex items-center gap-4 md:gap-8">
            <nav className="hidden md:flex gap-6 items-center text-sm font-medium text-slate-600">
              {(isLoggedIn ? NAV_AUTHED : []).map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={location.pathname === n.to ? 'text-indigo-600' : 'hover:text-indigo-600 transition-colors'}
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {!isLoggedIn ? (
                <Link to="/login" className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-full hover:bg-indigo-700 shadow-sm transition-colors">
                  로그인
                </Link>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 hover:bg-slate-100 p-1 pr-3 rounded-full border border-slate-200 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">
                      {userName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-bold text-slate-800">{userName}님</span>
                    <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-slate-600" aria-hidden="true">
                      expand_more
                    </span>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 top-11 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-[100] overflow-hidden">
                      <Link
                        to="/reservations"
                        className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        내 신청 현황
                      </Link>
                      <div className="border-t border-slate-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-bold"
                      >
                        로그아웃
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PL-12: 모바일 햄버거 — 대표 사용자가 현장에서 폰으로 쓰는 대리검색자다 */}
            <button
              className="md:hidden p-2 -mr-2 text-slate-700"
              aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <span className="material-symbols-outlined text-[26px]" aria-hidden="true">
                {mobileOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden absolute left-0 right-0 top-20 bg-white border-b border-slate-200 shadow-lg px-4 py-3 space-y-1">
            {(isLoggedIn ? NAV_AUTHED : []).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`block px-3 py-3 rounded-lg text-[15px] font-bold ${
                  location.pathname === n.to ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {n.label}
              </Link>
            ))}
            <div className="border-t border-slate-100 pt-2 mt-2 flex items-center justify-between px-3 pb-1">
              {!isLoggedIn ? (
                <Link to="/login" className="text-[15px] font-bold text-indigo-600">로그인</Link>
              ) : (
                <>
                  <span className="text-sm font-bold text-slate-700">{userName}님</span>
                  <button onClick={handleLogout} className="text-sm font-bold text-red-600">로그아웃</button>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 pt-20 flex flex-col">
        <Outlet />
      </main>

      {/* PL-09: 확인하지 않은 상태를 표시하지 않는다 */}
      <footer className="bg-slate-100 border-t border-slate-200 px-6 py-3 text-[11px] text-slate-400 font-medium">
        <div className="flex flex-wrap gap-x-4 gap-y-1 max-w-7xl mx-auto w-full justify-between items-center">
          <span>봉화군 도시계획과 도시재생팀 · 시범 서비스 © 2026</span>
          <div className="flex gap-x-4 items-center">
            <Link to="/credits" className="hover:text-slate-600 underline underline-offset-2">
              이미지 출처
            </Link>
            <Link to="/privacy" className="hover:text-slate-600 underline underline-offset-2">
              개인정보 처리 안내
            </Link>
            <Link to="/admin/login" className="flex items-center gap-1 hover:text-slate-600 underline underline-offset-2">
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">lock</span>
              담당자 로그인
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
