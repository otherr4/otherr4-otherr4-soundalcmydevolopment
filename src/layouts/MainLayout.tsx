import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Footer from '../components/common/Footer';
import BottomNavBar from '../components/common/BottomNavBar';
import FloatingMessagingButton from '../components/messaging/FloatingMessagingButton';
import { useAuth } from '../contexts/AuthContext';

const SIDEBAR_EXPANDED_WIDTH = 280; // px
const SIDEBAR_COLLAPSED_WIDTH = 72; // px

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Calculate margin for main content (desktop only)
  const mainMarginLeft = user
    ? isSidebarExpanded
      ? 'ml-[280px]'
      : 'ml-[72px]'
    : 'ml-0';

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  return (
    <div className="flex flex-col min-h-screen bg-dark-900">
      <Navbar onSidebarToggle={toggleSidebar} />
      <div className="flex flex-grow pt-16">
        {/* Hide sidebar on mobile */}
        <div className="hidden md:block">
          <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
        </div>
        <main
          className={`flex-grow w-full min-h-screen transition-all duration-300 ${mainMarginLeft} max-md:ml-0 px-2 sm:px-4 md:px-6 py-6 pb-24`}
        >
          <Outlet />
        </main>
      </div>
      <Footer />
      {/* Show bottom nav only on mobile */}
      <BottomNavBar />
      
      {/* Floating Messaging Button - Only for verified users */}
      <FloatingMessagingButton />
    </div>
  );
};

export default MainLayout;