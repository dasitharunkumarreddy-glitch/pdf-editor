import React, { useEffect } from 'react';
import { usePdfStore } from '../store/pdfStore';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = usePdfStore();

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark');
      root.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  return (
    <button
      onClick={toggleDarkMode}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-250 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700"
    >
      {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
};
