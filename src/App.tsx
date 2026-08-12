import { BrowserRouter, Routes, Route , Navigate } from 'react-router';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSpace from './pages/admin/AdminSpace';
import AdminLog from './pages/admin/AdminLog';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminAccount from './pages/admin/AdminAccount';
import AdminLogin from './pages/admin/AdminLogin';

import UserLayout from './layouts/UserLayout';
import UserHome from './pages/user/UserHome';
import UserSearch from './pages/user/UserSearch';
import UserSpaces from './pages/user/UserSpaces';
import SpaceDetail from './pages/user/SpaceDetail';
import UserReservations from './pages/user/UserReservations';
import UserLogin from './pages/user/UserLogin';
import NotFound from './pages/misc/NotFound';
import Privacy from './pages/misc/Privacy';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="space" element={<AdminSpace />} />
            <Route path="log" element={<AdminLog />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="account" element={<AdminAccount />} />
          </Route>

          <Route path="/" element={<UserLayout />}>
            <Route index element={<UserHome />} />
            <Route path="search" element={<UserSearch />} />
            <Route path="spaces" element={<UserSpaces />} />
            <Route path="spaces/:id" element={<SpaceDetail />} />
            {/* 구 「조건조회」 — 공간안내로 합쳤다. 기존 링크가 깨지지 않게 표 보기로 넘긴다 */}
          <Route path="filter" element={<Navigate to="/spaces?view=table" replace />} />
            <Route path="reservations" element={<UserReservations />} />
            <Route path="login" element={<UserLogin />} />
            <Route path="privacy" element={<Privacy />} />
            {/* PL-11: 잘못된 주소도 안내 화면을 받는다 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
