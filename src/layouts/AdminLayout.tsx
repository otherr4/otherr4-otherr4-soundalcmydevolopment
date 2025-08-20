import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Music, 
  LayoutDashboard, 
  Users, 
  Database, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  User,
  MessageSquare,
  Video,
  Phone,
  Bot
} from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-dark-800 flex">
      {/* Sidebar */}
      <aside 
        className={`bg-dark-900 fixed inset-y-0 left-0 z-50 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out w-64 overflow-y-auto`}
      >
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center space-x-2">
            <Music size={28} className="text-secondary-500" />
            <span className="text-xl font-display font-bold bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text">
              SoundAlchemy
            </span>
          </Link>
          <button 
            className="md:hidden text-gray-500 hover:text-white"
            onClick={toggleSidebar}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-5 px-2">
          <Link
            to="/admin/dashboard"
            className={`flex items-center p-3 mb-2 rounded-md ${
              isActive('/admin/dashboard')
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-dark-700 hover:text-white'
            } transition-colors duration-200`}
          >
            <LayoutDashboard size={20} className="mr-3" />
            Dashboard
          </Link>
          <Link
            to="/admin/users"
            className={`flex items-center p-3 mb-2 rounded-md ${
              isActive('/admin/users')
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-dark-700 hover:text-white'
            } transition-colors duration-200`}
          >
            <Users size={20} className="mr-3" />
            Musicians
          </Link>
          <Link
            to="/admin/database"
            className={`flex items-center p-3 mb-2 rounded-md ${
              isActive('/admin/database')
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-dark-700 hover:text-white'
            } transition-colors duration-200`}
          >
            <Database size={20} className="mr-3" />
            Database
          </Link>

          {/* Communication Section */}
          <div className="mt-8 border-t border-dark-700 pt-4">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Communication
            </h3>
            <Link
              to="/admin/communication"
              className={`flex items-center p-3 mb-2 rounded-md ${
                isActive('/admin/communication')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-dark-700 hover:text-white'
              } transition-colors duration-200`}
            >
              <MessageSquare size={20} className="mr-3" />
              Communication Hub
            </Link>
            <Link
              to="/admin/messaging"
              className={`flex items-center p-3 mb-2 rounded-md ${
                isActive('/admin/messaging')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-dark-700 hover:text-white'
              } transition-colors duration-200`}
            >
              <Bot size={20} className="mr-3" />
              AI Messaging
            </Link>
          </div>

          <div className="mt-8 border-t border-dark-700 pt-4">
            <Link
              to="/admin/settings"
              className={`flex items-center p-3 mb-2 rounded-md ${
                isActive('/admin/settings')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-dark-700 hover:text-white'
              } transition-colors duration-200`}
            >
              <Settings size={20} className="mr-3" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center p-3 rounded-md text-gray-400 hover:bg-dark-700 hover:text-white transition-colors duration-200"
            >
              <LogOut size={20} className="mr-3" />
              Logout
            </button>
          </div>
        </nav>
      </aside>

      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : ''}`}>
        {/* Top Bar */}
        <div className="bg-dark-900 border-b border-dark-700 p-4 flex justify-between items-center">
          <button
            className="text-gray-500 hover:text-white md:hidden"
            onClick={toggleSidebar}
          >
            <Menu size={24} />
          </button>

          <div className="ml-4 md:ml-0">
            <h1 className="text-xl font-semibold text-white">Admin Dashboard</h1>
          </div>

          <div className="flex items-center space-x-4">
            <button className="text-gray-400 hover:text-white relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-secondary-500 ring-2 ring-dark-900"></span>
            </button>
            
            <div className="relative">
              <button 
                className="flex items-center space-x-2 text-gray-400 hover:text-white"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white">
                  <User size={16} />
                </div>
                <span className="hidden md:block">Admin</span>
              </button>
              
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-dark-800 border border-dark-600 rounded-md shadow-lg py-1 z-10">
                  <a href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-dark-700">Your Profile</a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-dark-700">Settings</a>
                  <div className="border-t border-dark-600 my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-dark-700"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;