import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function UserLayout() {
  const location = useLocation();
  const { isLoggedIn, userName, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    navigate('/');
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans">
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center transition-all h-20">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">M</div>
            <div>
              <h1 className="text-lg font-bold leading-none text-slate-800">MODI Hub AI</h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Bonghwa Urban Regeneration</p>
            </div>
          </Link>
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex gap-6 items-center text-sm font-medium text-slate-600">
              <Link to="/" className={`${location.pathname === '/' ? 'text-indigo-600' : 'hover:text-indigo-600 transition-colors'}`}>홈</Link>
              <Link to="/spaces" className={`${location.pathname === '/spaces' ? 'text-indigo-600' : 'hover:text-indigo-600 transition-colors'}`}>공간안내</Link>
            </nav>
            <div className="flex items-center gap-3">
              {!isLoggedIn ? (
                <>
                  <Link to="/login" className="px-5 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
                    로그인
                  </Link>
                  <Link to="/login" className="px-5 py-2 text-sm font-bold text-white bg-emerald-500 rounded-full hover:bg-emerald-600 shadow-sm transition-colors">
                    회원가입
                  </Link>
                </>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 hover:bg-slate-100 p-1 pr-3 rounded-full border border-slate-200 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">
                      {userName?.charAt(0) || '👤'}
                    </div>
                    <span className="text-sm font-bold text-slate-800">{userName}님</span>
                    <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-slate-600 transition-colors">
                      expand_more
                    </span>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 top-11 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-[100] overflow-hidden">
                      <Link 
                        to="/reservations" 
                        className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        내 예약 현황
                      </Link>
                      <button 
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                      >
                        프로필 설정
                      </button>
                      <div className="border-t border-slate-100 my-1"></div>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-bold transition-colors"
                      >
                        로그아웃
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 pt-20 flex flex-col">
        <Outlet />
      </main>
      
      <footer className="bg-slate-100 border-t border-slate-200 px-6 py-2 flex justify-between items-center text-[10px] text-slate-400 font-medium">
        <div className="flex gap-4 max-w-7xl mx-auto w-full justify-between items-center">
          <div className="flex gap-4">
            <span>BONGHWA URBAN REGENERATION PROJECT © 2024</span>
            <span className="hidden sm:inline">봉화군 도시재생 지원센터</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Gemini 1.5 Flash Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

