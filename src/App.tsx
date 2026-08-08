/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router';
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
import UserReservations from './pages/user/UserReservations';
import UserLogin from './pages/user/UserLogin';
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
          <Route path="reservations" element={<UserReservations />} />
          <Route path="login" element={<UserLogin />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
