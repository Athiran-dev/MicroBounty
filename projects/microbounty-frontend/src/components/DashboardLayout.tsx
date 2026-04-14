import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Bot, Settings, HelpCircle, LogOut } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export default function DashboardLayout({ children, showSidebar = true }: DashboardLayoutProps) {
  const location = useLocation();

  const sidebarLinks = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'My Bounties', icon: ClipboardList, path: '/profile' },
    { name: 'AI Agents', icon: Bot, path: '/ai-tasks' },
    { name: 'Transactions', icon: ClipboardList, path: '/transactions' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="flex flex-1 min-h-[calc(100vh-64px)] bg-[#F9FAFB] dark:bg-[#12141C] transition-colors duration-200">
      {/* Sidebar */}
      {showSidebar && (
        <aside className="w-64 border-r border-gray-200 dark:border-[#262A36] bg-[#F4F5F7] dark:bg-[#15171E] flex flex-col hidden lg:flex fixed h-[calc(100vh-64px)] left-0 top-[64px] transition-colors duration-200">

        
        {/* Brand Area */}
        <div className="p-6 border-b border-gray-200 dark:border-[#262A36]">
          <h2 className="text-xl font-black tracking-tight text-[#6D28D9] dark:text-[#C4A1FF]">
            MicroBounty
          </h2>
          <p className="text-[10px] text-gray-500 dark:text-[#94A3B8] uppercase tracking-widest mt-1 font-bold">Decentralized AI Hub</p>
        </div>

        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[#6D28D9] dark:bg-[#A37CF0] text-white dark:text-[#12141C] shadow-md shadow-[#6D28D9]/20 dark:shadow-[#A37CF0]/10 font-bold' 
                    : 'text-gray-600 dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#1A1D24] hover:text-gray-900 dark:hover:text-white hover:shadow-sm font-medium'
                }`}
              >
                <link.icon className="w-5 h-5" />
                <span className="text-sm">{link.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 space-y-2 border-t border-gray-200 dark:border-[#262A36]">
          <Link
            to="/help"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#1A1D24] hover:text-gray-900 dark:hover:text-white transition-all font-medium"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-sm">Help Center</span>
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#1A1D24] hover:text-gray-900 dark:hover:text-white transition-all font-medium">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 ${showSidebar ? 'lg:ml-64' : ''} bg-[#F9FAFB] dark:bg-[#12141C] min-h-full transition-colors duration-200`}>
        {children}
      </main>
    </div>
  );
}
