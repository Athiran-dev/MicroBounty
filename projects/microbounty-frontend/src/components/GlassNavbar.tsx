import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@txnlab/use-wallet-react';
import { Bell, Menu, X, User, LogOut } from 'lucide-react';
import ConnectWalletModal from './ConnectWalletModal';
import { shortenAddress } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
// import { useTheme } from '../context/ThemeContext';

export default function GlassNavbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  
  // const { isDarkMode, toggleTheme } = useTheme();
  
  const { activeAddress, wallets } = useWallet();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { name: 'Explore', path: '/explore' },
    { name: 'AI Tasks', path: '/ai-tasks' },
    { name: 'Post Bounty', path: '/create' },
    { name: 'Leaderboard', path: '/leaderboard' }
  ];

  const handleDisconnect = () => {
    console.log("Attempting to disconnect all wallets...");
    if (wallets) {
      wallets.forEach((wallet) => {
        if (wallet.isConnected) {
          console.log(`Disconnecting ${wallet.metadata.name}...`);
          wallet.disconnect();
        }
      });
    }
    setIsProfileDropdownOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[50] bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#262A36] h-16 transition-colors duration-200">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between gap-8">
          
          {/* Logo & Links Left */}
          <div className="flex items-center gap-12 h-full">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-[#6D28D9] dark:text-[#C4A1FF]">
                MicroBounty
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-8 h-full">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path) || (location.pathname === '/' && link.path === '/explore');
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`text-sm font-bold h-full flex items-center border-b-2 transition-all ${
                      isActive
                        ? 'text-[#6D28D9] dark:text-[#C4A1FF] border-[#6D28D9] dark:border-[#C4A1FF]'
                        : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4 h-full">
            {/* Theme Toggle Removed */}

            <button className="text-gray-600 dark:text-gray-400 hover:text-[#6D28D9] dark:hover:text-[#C4A1FF] hover:bg-gray-50 dark:hover:bg-[#1A1D24] p-2 rounded-full transition-colors hidden sm:block">
              <Bell className="w-5 h-5" />
            </button>

            {activeAddress ? (
              <div className="relative" ref={dropdownRef}>
                <div 
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 bg-[#F3E8FF] dark:bg-[#262A36] hover:bg-[#E9D5FF] dark:hover:bg-[#334155] cursor-pointer text-[#6D28D9] dark:text-[#C4A1FF] px-4 py-2 rounded-full font-bold text-xs transition-colors"
                >
                  <span className="hidden sm:inline">0.00 ALGO</span>
                  <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">|</span>
                  <span>{shortenAddress(activeAddress)}</span>
                </div>

                {/* Profile Dropdown */}
                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1A1D24] border border-gray-200 dark:border-[#262A36] rounded-xl shadow-lg py-2 flex flex-col z-50 overflow-hidden"
                    >
                      <Link 
                        to="/profile" 
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#262A36] text-gray-700 dark:text-gray-300 hover:text-[#6D28D9] dark:hover:text-[#C4A1FF] font-medium transition-colors text-sm"
                      >
                        <User className="w-4 h-4" /> My Profile
                      </Link>
                      <div className="h-[1px] bg-gray-100 dark:bg-[#262A36] my-1" />
                      <button 
                        onClick={handleDisconnect}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium transition-colors text-sm text-left w-full"
                      >
                        <LogOut className="w-4 h-4" /> Disconnect
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="border border-gray-300 dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#1A1D24] text-gray-900 dark:text-white px-5 py-2 rounded-full font-bold text-sm transition-all"
              >
                Connect Wallet
              </button>
            )}

            {/* Mobile Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-gray-900 dark:text-white p-2"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed inset-x-0 top-16 z-40 bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#262A36] px-6 py-8 shadow-xl"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-bold text-gray-900 dark:text-white hover:text-[#6D28D9] dark:hover:text-[#C4A1FF] transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConnectWalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
