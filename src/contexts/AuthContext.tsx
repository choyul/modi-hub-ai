import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  userName: string | null;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // localStorage에서 초기 상태 복원
  useEffect(() => {
    const user = localStorage.getItem('modi_user');
    if (user) {
      setIsLoggedIn(true);
      setUserName(user);
    }
  }, []);

  const login = (email: string, pass: string) => {
    // 데모 로직
    if (email === 'demo@bonghwa.go.kr' && pass === 'modi2026') {
      localStorage.setItem('modi_user', '박정희');
      setIsLoggedIn(true);
      setUserName('박정희');
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('modi_user');
    setIsLoggedIn(false);
    setUserName(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
