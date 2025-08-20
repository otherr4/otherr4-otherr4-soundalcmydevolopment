import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, X, Music, User, LogOut, Menu as MenuIcon, ExternalLink, Bell, Settings, MessageCircle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from 'react-i18next';
import { useSidebarNotification } from './SidebarNotificationContext';
import MessagingButton from '../messaging/MessagingButton';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getGoogleDriveDirectUrl } from '../../utils/profileImage';

interface NavbarProps {
  onSidebarToggle?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSidebarToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { unreadCount, openNotificationModal } = useSidebarNotification();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } else {
        setUserProfile(null);
      }
    };
    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-gradient-to-r from-dark-900 via-dark-800 to-dark-900 backdrop-blur-md fixed w-full top-0 z-50 shadow-lg border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Sidebar Toggle */}
          <div className="flex items-center">
            {/* Sidebar Toggle Button - Only show for logged in users on desktop */}
            {user && (
              <button
                onClick={onSidebarToggle}
                className="hidden md:block p-2 mr-2 rounded-full hover:bg-primary-500/20 transition-all duration-300 group"
                aria-label="Toggle Sidebar"
              >
                <MenuIcon size={24} className="text-gray-300 group-hover:text-primary-400 transition-colors duration-300" />
              </button>
            )}
            
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <Music size={28} className="text-secondary-500 group-hover:text-secondary-400 transition-colors duration-300" />
              <span className="text-xl font-display font-bold bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400 bg-clip-text text-transparent group-hover:from-primary-300 group-hover:via-secondary-300 group-hover:to-primary-300 transition-all duration-300">
                SoundAlcmy
              </span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={`nav-link relative group ${location.pathname === '/' ? 'active-nav-link' : ''}`}
            >
              <span className="relative">
                {t('home')}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-400 group-hover:w-full transition-all duration-300"></span>
              </span>
            </Link>
            
            <a
              href="https://sound-alchemy-official-finished.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary py-1.5 px-4 flex items-center space-x-2 hover:scale-105 transition-all duration-300 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-400 hover:to-secondary-400 shadow-lg shadow-primary-500/20"
            >
              <span>{t('official_website')}</span>
              <ExternalLink size={16} className="group-hover:translate-x-0.5 transition-transform duration-300" />
            </a>
            
            {user ? (
              <>
                {/* Messaging Button - Only for verified users */}
                <div className="flex items-center">
                  <MessagingButton />
                </div>
                
                <Link
                  to="/profile"
                  className={`nav-link relative group flex items-center gap-2 ${location.pathname.includes('/profile') ? 'active-nav-link' : ''}`}
                >
                  {userProfile?.profileImagePath ? (
                    <img
                      src={getGoogleDriveDirectUrl(userProfile.profileImagePath)}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary-400"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg'; }}
                    />
                  ) : (
                    <User size={24} className="text-gray-400" />
                  )}
                  <span className="relative">
                    {t('profile')}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-400 group-hover:w-full transition-all duration-300"></span>
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn-outline py-1.5 px-4 flex items-center space-x-1 hover:bg-dark-700/80 hover:border-primary-400 hover:text-primary-400 transition-all duration-300"
                >
                  <LogOut size={16} />
                  <span>{t('logout')}</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`nav-link relative group ${location.pathname === '/login' ? 'active-nav-link' : ''}`}
                >
                  <span className="relative">
                    {t('login')}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-400 group-hover:w-full transition-all duration-300"></span>
                  </span>
                </Link>
                <Link
                  to="/register"
                  className="btn-primary py-1.5 px-4 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-400 hover:to-secondary-400 shadow-lg shadow-primary-500/20 hover:scale-105 transition-all duration-300"
                >
                  {t('register')}
                </Link>
              </>
            )}
            
            {/* Language Selector */}
            <LanguageSelector />
            
            {/* Notification Bell - Only for logged in users */}
            {user && (
              <button
                className="relative p-2 rounded-full hover:bg-primary-500/20 transition-all duration-300 group"
                aria-label="Notifications"
                onClick={openNotificationModal}
              >
                <Bell size={24} className="text-gray-300 group-hover:text-primary-400 transition-colors duration-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold animate-pulse min-w-[18px] flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            {user && (
              <Link
                to="/settings"
                className="relative p-2 rounded-full hover:bg-primary-500/20 transition-all duration-300 group ml-2"
                aria-label="Settings"
                title="Settings"
              >
                <Settings size={24} className="text-gray-300 group-hover:text-primary-400 transition-colors duration-300" />
              </Link>
            )}
            {/* Support Link - move to far right */}
            <Link
              to="/support"
              className={`ml-4 nav-link relative group flex items-center gap-2 ${location.pathname === '/support' ? 'active-nav-link' : ''}`}
              aria-label="Musician Support"
            >
              <HelpCircle size={24} className="text-primary-400 group-hover:text-secondary-400 transition-colors duration-300" />
              <span className="relative">
                {t('support') || 'Support'}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-400 group-hover:w-full transition-all duration-300"></span>
              </span>
            </Link>
          </div>

          {/* Mobile menu button and notification bell */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Messaging Button for mobile - Only for verified users */}
            {user && (
              <div className="flex items-center">
                <MessagingButton />
              </div>
            )}
            
            {/* Notification Bell for mobile - Only for logged in users */}
            {user && (
              <button
                className="relative p-2 rounded-full hover:bg-primary-500/20 transition-all duration-300 group"
                aria-label="Notifications"
                onClick={openNotificationModal}
              >
                <Bell size={20} className="text-gray-300 group-hover:text-primary-400 transition-colors duration-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold animate-pulse min-w-[16px] flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            {user && (
              <Link
                to="/settings"
                className="relative p-2 rounded-full hover:bg-primary-500/20 transition-all duration-300 group ml-2"
                aria-label="Settings"
                title="Settings"
              >
                <Settings size={20} className="text-gray-300 group-hover:text-primary-400 transition-colors duration-300" />
              </Link>
            )}
            
            {/* Mobile menu toggle */}
            <button
              onClick={toggleMenu}
              className="text-gray-300 hover:text-primary-400 focus:outline-none transition-colors duration-300 p-2 rounded-full hover:bg-primary-500/20"
              aria-label="Toggle mobile menu"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-dark-800/95 backdrop-blur-md shadow-xl border-t border-dark-700/50 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {/* Navigation Links */}
              <div className="space-y-2">
                <Link
                  to="/"
                  className={`flex items-center px-3 py-3 rounded-lg transition-all duration-300 ${
                    location.pathname === '/' 
                      ? 'bg-gradient-to-r from-primary-500/20 to-secondary-500/20 text-white border border-primary-500/30' 
                      : 'text-gray-300 hover:bg-dark-700/80 hover:text-white'
                  }`}
                  onClick={closeMenu}
                >
                  <span className="text-lg mr-3">🏠</span>
                  {t('home')}
                </Link>
                {/* Support Link for mobile */}
                <Link
                  to="/support"
                  className={`flex items-center px-3 py-3 rounded-lg transition-all duration-300 ${
                    location.pathname === '/support' 
                      ? 'bg-gradient-to-r from-primary-500/20 to-secondary-500/20 text-white border border-primary-500/30' 
                      : 'text-gray-300 hover:bg-dark-700/80 hover:text-white'
                  }`}
                  onClick={closeMenu}
                  aria-label="Musician Support"
                >
                  <HelpCircle size={20} className="mr-3 text-primary-400" />
                  {t('support') || 'Support'}
                </Link>

                {/* Messaging Link for mobile */}
                {user && (
                  <Link
                    to="/messaging"
                    className={`flex items-center px-3 py-3 rounded-lg transition-all duration-300 ${
                      location.pathname.includes('/messaging') 
                        ? 'bg-gradient-to-r from-primary-500/20 to-secondary-500/20 text-white border border-primary-500/30' 
                        : 'text-gray-300 hover:bg-dark-700/80 hover:text-white'
                    }`}
                    onClick={closeMenu}
                  >
                    <MessageCircle size={20} className="mr-3" />
                    Messages
                  </Link>
                )}

                <Link
                  to="/profile"
                  className={`flex items-center px-3 py-3 rounded-lg transition-all duration-300 ${
                    location.pathname.includes('/profile') 
                      ? 'bg-gradient-to-r from-primary-500/20 to-secondary-500/20 text-white border border-primary-500/30' 
                      : 'text-gray-300 hover:bg-dark-700/80 hover:text-white'
                  }`}
                  onClick={closeMenu}
                >
                  <User size={20} className="mr-3" />
                  {t('profile')}
                </Link>

                <a
                  href="https://sound-alchemy-official-finished.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-3 rounded-lg text-gray-300 hover:bg-dark-700/80 hover:text-white transition-all duration-300"
                  onClick={closeMenu}
                >
                  <ExternalLink size={20} className="mr-3" />
                  {t('official_website')}
                </a>
              </div>

              {/* User Actions */}
              {user ? (
                <div className="pt-4 border-t border-dark-700/50">
                  <button
                    onClick={() => {
                      handleLogout();
                      closeMenu();
                    }}
                    className="flex items-center w-full px-3 py-3 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300"
                  >
                    <LogOut size={20} className="mr-3" />
                    {t('logout')}
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-dark-700/50 space-y-2">
                  <Link
                    to="/login"
                    className="flex items-center px-3 py-3 rounded-lg text-gray-300 hover:bg-dark-700/80 hover:text-white transition-all duration-300"
                    onClick={closeMenu}
                  >
                    <span className="text-lg mr-3">🔐</span>
                    {t('login')}
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center px-3 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-400 hover:to-secondary-400 transition-all duration-300"
                    onClick={closeMenu}
                  >
                    <span className="text-lg mr-3">📝</span>
                    {t('register')}
                  </Link>
                </div>
              )}

              {/* Language Selector for mobile */}
              <div className="pt-4 border-t border-dark-700/50">
                <LanguageSelector />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
