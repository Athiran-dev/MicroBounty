import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@txnlab/use-wallet-react';
import { Wallet, Menu, X, Rocket, Bell, Search, User, CircleUser, Sun, Moon } from 'lucide-react';
import ConnectWalletModal from './ConnectWalletModal';
import { shortenAddress } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

export default function GlassNavbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { activeAddress } = useWallet();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const handleThemeToggle = (e: React.MouseEvent) => {
    toggleTheme(e.clientX, e.clientY);
  };

  const navLinks = [
    { name: 'Explore', path: '/explore' },
    { name: 'Bounties', path: '/explore' },
    { name: 'Initiate', path: '/create' }
  ];

  const profileLink = activeAddress ? { name: 'Profile', path: '/profile' } : null;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[50] border-b border-brand-outline-variant/10 backdrop-blur-2xl bg-[#030712]/40">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          
          {/* Logo & Links Left */}
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="text-xl font-display font-black tracking-tighter uppercase italic text-brand-text">
                MICRO<span className="text-brand-primary">BOUNTY</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-[13px] font-medium transition-all relative group ${
                    location.pathname === link.path
                      ? 'text-brand-primary'
                      : 'text-brand-text-dim hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              {profileLink && (
                <Link
                  to={profileLink.path}
                  className={`text-[13px] font-medium transition-all relative group ${
                    location.pathname === profileLink.path
                      ? 'text-brand-primary'
                      : 'text-brand-text-dim hover:text-white'
                  }`}
                >
                  {profileLink.name}
                </Link>
              )}
            </div>
          </div>

          {/* Search & Actions Right */}
          <div className="flex-1 flex items-center justify-end gap-6">
            {/* Search Bar */}
            <div className="hidden md:flex items-center relative flex-1 max-w-[320px] group">
              <Search className="absolute left-3 w-4 h-4 text-brand-text-dim/60 group-focus-within:text-brand-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search bounties..." 
                className="w-full bg-brand-surface-high/40 border border-brand-outline-variant/20 rounded-lg pl-10 pr-4 py-2 text-xs font-light italic outline-none focus:border-brand-primary/50 transition-all text-brand-text"
              />
            </div>

            <div className="flex items-center gap-4">
              <button onClick={handleThemeToggle} className="text-brand-text-dim hover:text-white transition-colors p-1">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <button className="text-brand-text-dim hover:text-white transition-colors p-1 relative">
                <Bell className="w-5 h-5" />
                <div className="absolute top-1 right-1 w-2 h-2 bg-brand-primary rounded-full border-2 border-[#030712]" />
              </button>

              {activeAddress && (
                <Link to="/profile" className="text-brand-text-dim hover:text-white transition-colors p-1">
                  <User className="w-5 h-5" />
                </Link>
              )}
              
              <button className="text-brand-text-dim hover:text-white transition-colors p-1">
                <Wallet className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-brand-primary hover:bg-brand-primary/90 text-white px-5 py-2 rounded-lg font-bold text-[13px] tracking-tight transition-all shadow-lg active:scale-95"
              >
                {activeAddress ? shortenAddress(activeAddress) : 'Connect Wallet'}
              </button>
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-brand-text"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed inset-x-0 top-16 z-40 bg-brand-bg/95 backdrop-blur-3xl border-b border-brand-outline-variant px-6 py-8"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-bold text-brand-text hover:text-brand-primary"
                >
                  {link.name}
                </Link>
              ))}
              {profileLink && (
                <Link
                  to={profileLink.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-bold text-brand-text hover:text-brand-primary"
                >
                  {profileLink.name}
                </Link>
              )}
              <div className="pt-4 border-t border-brand-outline-variant/20 flex items-center gap-4">
                 <button onClick={handleThemeToggle} className="text-brand-text-dim">Toggle Theme</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConnectWalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
