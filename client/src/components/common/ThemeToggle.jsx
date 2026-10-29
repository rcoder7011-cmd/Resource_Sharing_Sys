import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Accessible Theme Toggle button with smooth transitions and keyboard navigation.
 * Displays a Sun icon in Light Mode and a Moon icon in Dark Mode.
 */
export default function ThemeToggle({ className = '', showLabel = false }) {
  const { theme, isDark, toggleTheme } = useTheme();

  const titleText = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  const ariaLabel = `Theme is ${theme}. Press to switch to ${isDark ? 'light' : 'dark'} mode.`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-200 select-none
        border border-slate-200 dark:border-slate-800
        bg-white/80 dark:bg-slate-900/80
        hover:bg-slate-100 dark:hover:bg-slate-800
        text-slate-700 dark:text-slate-300
        hover:text-amber-500 dark:hover:text-blue-400
        shadow-sm hover:shadow
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950
        ${className}`}
      title={titleText}
      aria-label={ariaLabel}
      aria-pressed={isDark}
    >
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        {/* Sun Icon (Visible in Light Mode) */}
        <Sun
          className={`w-4 h-4 sm:w-5 sm:h-5 text-amber-500 transition-all duration-300 absolute ${
            isDark
              ? 'opacity-0 rotate-90 scale-50 pointer-events-none'
              : 'opacity-100 rotate-0 scale-100'
          }`}
          aria-hidden="true"
        />
        {/* Moon Icon (Visible in Dark Mode) */}
        <Moon
          className={`w-4 h-4 sm:w-5 sm:h-5 text-blue-400 transition-all duration-300 absolute ${
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-50 pointer-events-none'
          }`}
          aria-hidden="true"
        />
      </div>

      {showLabel && (
        <span className="ml-2 text-xs font-semibold uppercase tracking-wider">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}
