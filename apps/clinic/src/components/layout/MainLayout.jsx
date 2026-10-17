import React, { useState } from 'react';
import Sidebar from '../common/Sidebar';
import TopBar from './TopBar';
import BottomNav from '../common/BottomNav';
import AnnouncementBanner from './AnnouncementBanner';
import DentiGuideWidget from '../ai/DentiGuideWidget';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-300">
      {/* Skip to Content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-accent)] focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Lompati ke Konten Utama
      </a>

      {/* Background ambient gradient for the AI futuristic feel */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent-primary/5 dark:bg-accent-primary/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-secondary/5 dark:bg-accent-secondary/10 blur-[100px]" />
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 pb-20 md:pb-8 focus:outline-none"
        >
          <div className="max-w-[1400px] mx-auto w-full">
            <AnnouncementBanner />
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNav />
      </div>

      {/* Eira Pemandu: pendamping mengambang untuk semua peran (otak lokal, tanpa kuota AI) */}
      <DentiGuideWidget />
    </div>
  );
};

export default MainLayout;
