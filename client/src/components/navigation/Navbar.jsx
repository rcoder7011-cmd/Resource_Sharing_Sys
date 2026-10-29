import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Box, User, LogOut, LayoutDashboard, LogIn, PackagePlus, ShieldCheck, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Button from '../common/Button';
import NotificationBell from '../notifications/NotificationBell';
import { APP_NAME } from '../../utils/constants';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadChatCount } = useNotifications() || {};

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Explore Resources', path: '/resources' },
    { name: 'Smart Match', path: '/match' },
    { name: 'How It Works', path: '/#how-it-works' },
    { name: 'Trust & Safety', path: '/#trust-safety' },
    { name: 'Fair Access', path: '/#fair-access' },
  ];

  const isActive = (path) => {
    if (path.startsWith('/#')) {
      return location.pathname === '/' && location.hash === path.substring(1);
    }
    return location.pathname === path;
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      {/* Institutional Notice Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-xs py-1.5 px-4 text-center text-slate-400 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
        <span>
          Institutional Resource Sharing Network • Verified & Operational
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 group-hover:bg-blue-500 transition-colors">
              <Box className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white leading-none">
                {APP_NAME}
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mt-0.5">
                Resource Sharing
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-white bg-slate-800/70 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <Button
                  to="/create-resource"
                  variant="primary"
                  size="sm"
                  icon={PackagePlus}
                >
                  + List Resource
                </Button>

                {/* Real-time Notification Bell */}
                <NotificationBell />

                {/* Real-time In-App Chat & Messages Button */}
                <Link
                  to="/chat"
                  className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Messages & Pickup Coordination"
                >
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  {Boolean(unreadChatCount && unreadChatCount > 0) && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-blue-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                      {unreadChatCount > 99 ? '99+' : unreadChatCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                    <User className="w-3 h-3" />
                  </div>
                  <span className="font-medium max-w-[120px] truncate">
                    {user?.name || 'Account'}
                  </span>
                </Link>

                <Button
                  to="/dashboard"
                  variant="outline"
                  size="sm"
                  icon={LayoutDashboard}
                >
                  Dashboard
                </Button>

                {user?.role === 'admin' && (
                  <Button
                    to="/admin"
                    variant="primary"
                    size="sm"
                    icon={ShieldCheck}
                    className="!bg-purple-600 hover:!bg-purple-500 shadow-purple-600/30"
                  >
                    Admin Portal
                  </Button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Button to="/register" variant="primary" size="sm">
                  Sign Up
                </Button>
              </>
            )}

            <Button to="/resources" variant="secondary" size="sm">
              Explore
            </Button>
          </div>

          {/* Mobile Right Bar (Notification Bell + Hamburger) */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && <NotificationBell />}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-lg px-4 pt-3 pb-6 space-y-2">
          {/* User Status Bar in Mobile Menu */}
          {isAuthenticated && (
            <div className="p-3 mb-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-white">{user?.name}</p>
                  <p className="text-slate-400 text-[10px]">{user?.email}</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {user?.role || 'user'}
              </span>
            </div>
          )}

          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-white bg-slate-800 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {isAuthenticated && (
              <>
                <Link
                  to="/create-resource"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-blue-400 hover:text-white hover:bg-slate-900 flex items-center gap-2"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>List a Resource</span>
                </Link>

                <Link
                  to="/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                    isActive('/chat')
                      ? 'text-white bg-slate-800 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span>Messages & Coordination</span>
                  </span>
                  {Boolean(unreadChatCount && unreadChatCount > 0) && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
                      {unreadChatCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'text-white bg-slate-800 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Dashboard
                </Link>

                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold text-purple-400 hover:text-white hover:bg-slate-900 flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Portal</span>
                  </Link>
                )}
              </>
            )}
          </nav>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-2.5">
            <Button
              to="/resources"
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Explore Resources
            </Button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-rose-300 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  to="/login"
                  variant="outline"
                  size="md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Button>
                <Button
                  to="/register"
                  variant="primary"
                  size="md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
