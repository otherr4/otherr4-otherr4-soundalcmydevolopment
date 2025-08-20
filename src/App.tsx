import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './config/i18n';
import { SidebarNotificationProvider } from './components/common/SidebarNotificationContext';
import { CallProvider } from './contexts/CallContext';
import { MessagingModalProvider, useMessagingModal } from './contexts/MessagingModalContext';
import MessagingInterface from './components/messaging/MessagingInterface';
import { HelmetProvider } from 'react-helmet-async';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import UserProfilePage from './pages/UserProfilePage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminRegisterPage from './pages/admin/RegisterPage';
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminDatabasePage from './pages/admin/DatabasePage';
import AdminMessagingPage from './pages/admin/AdminMessagingPage';
import NotFoundPage from './pages/NotFoundPage';
import Dashboard from './pages/Dashboard';
import PublicMusicianProfile from './pages/musician/[uid]';
import MessagingPage from './pages/MessagingPage';
import SettingsPage from './pages/SettingsPage';
import MusicianSupportPage from './pages/MusicianSupportPage';
import LiveChatPage from './pages/chat/LiveChatPage';
import MusicVideoShowPage from './pages/MusicVideoShowPage';
import MusicianChannelPage from './pages/musician/MusicianChannelPage';
import StartCollaborationPage from './pages/StartCollaborationPage';
import CollaborationsPage from './pages/CollaborationsPage';
import CollaborationDetailPage from './pages/CollaborationDetailPage';
import ZoomSchedulePage from './pages/chat/ZoomSchedulePage';
import ZoomJoinPage from './pages/chat/ZoomJoinPage';
import ZoomRecordingsPage from './pages/chat/ZoomRecordingsPage';
import VoiceChatPage from './pages/chat/VoiceChatPage';
import StudioPage from './pages/StudioPage';
import RecordingPage from './pages/RecordingPage';
import PodcastPage from './pages/PodcastPage';
import LiveStreamPage from './pages/LiveStreamPage';
import CommunityPage from './pages/CommunityPage';
import SpotifyAudioPage from './pages/SpotifyAudioPage';

// Route Guards
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const VerifiedUserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Check if user is verified (this would need to be implemented based on your user data structure)
  // For now, we'll allow all authenticated users to access messaging
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary-500"></div>
    </div>;
  }
  
  return user && isAdmin ? <>{children}</> : <Navigate to="/admin/login" />;
};

const MessagingModalRoot: React.FC = () => {
  const { isMessagingOpen, closeMessaging } = useMessagingModal();
  if (!isMessagingOpen) return null;
  return (
    <MessagingInterface isOpen={isMessagingOpen} onClose={closeMessaging} />
  );
};

function App() {
  return (
    <HelmetProvider>
      <CallProvider>
        <SidebarNotificationProvider>
          <MessagingModalProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="musician/:uid" element={<PublicMusicianProfile />} />
                <Route path="musician/:uid/channel" element={<MusicianChannelPage />} />
                <Route path="support" element={<MusicianSupportPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Auth Routes */}
              <Route path="/" element={<AuthLayout />}>
                <Route path="register" element={<RegisterPage />} />
                <Route path="login" element={<LoginPage />} />
              </Route>

              {/* User Protected Routes */}
              <Route path="/profile" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<UserProfilePage />} />
              </Route>

              <Route path="/dashboard" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<Dashboard />} />
              </Route>

              {/* Live Chat Route - Only for authenticated users */}
              <Route path="/chat/live" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<LiveChatPage />} />
              </Route>

              {/* Zoom Meetings */}
              <Route path="/chat/zoom" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<Navigate to="/chat/zoom/schedule" replace />} />
                <Route path="schedule" element={<ZoomSchedulePage />} />
                <Route path="join" element={<ZoomJoinPage />} />
                <Route path="recordings" element={<ZoomRecordingsPage />} />
              </Route>

              {/* Voice Chat */}
              <Route path="/chat/voice" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<VoiceChatPage />} />
              </Route>

              {/* Messaging Route - Only for verified users */}
              <Route path="/messaging" element={
                <VerifiedUserRoute>
                  <MainLayout />
                </VerifiedUserRoute>
              }>
                <Route index element={<MessagingPage />} />
              </Route>

              {/* Settings Route - Only for verified users */}
              <Route path="/settings" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<SettingsPage />} />
              </Route>

              {/* Music Video Show Route - Only for authenticated users */}
              <Route path="/music-videos" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<MusicVideoShowPage />} />
              </Route>

              {/* Community */}
              <Route path="/community" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<CommunityPage />} />
              </Route>

              {/* Audio Tools */}
              <Route path="/studio" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<StudioPage />} />
              </Route>
              <Route path="/recording" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<RecordingPage />} />
              </Route>
              <Route path="/podcast" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<PodcastPage />} />
              </Route>
              <Route path="/stream" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<LiveStreamPage />} />
              </Route>

              {/* Spotify */}
              <Route path="/spotify" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<SpotifyAudioPage />} />
              </Route>

              {/* Collaboration Routes - Only for authenticated users */}
              <Route path="/start-collaboration" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<StartCollaborationPage />} />
              </Route>

              <Route path="/collaborations" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<CollaborationsPage />} />
                <Route path=":id" element={<CollaborationDetailPage />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/register" element={<AdminRegisterPage />} />
              
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="database" element={<AdminDatabasePage />} />
                <Route path="messaging" element={<AdminMessagingPage />} />
              </Route>
            </Routes>
            {/* Place the modal root at the end so it overlays everything */}
            <MessagingModalRoot />
          </MessagingModalProvider>
        </SidebarNotificationProvider>
      </CallProvider>
    </HelmetProvider>
  );
}

export default App;