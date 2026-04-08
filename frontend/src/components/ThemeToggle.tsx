import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme');
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme || 'light');
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative w-14 h-7 rounded-full p-0.5 transition-colors duration-500 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
          : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
      }}
      aria-label="Toggle Theme"
    >
      {/* Track decorations */}
      <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        {/* Stars for dark mode */}
        <span className={`absolute top-1.5 left-2 w-0.5 h-0.5 rounded-full bg-white transition-opacity duration-500 ${isDark ? 'opacity-60' : 'opacity-0'}`} />
        <span className={`absolute top-3 left-3.5 w-[3px] h-[3px] rounded-full bg-white transition-opacity duration-500 delay-75 ${isDark ? 'opacity-40' : 'opacity-0'}`} />
        <span className={`absolute top-1 left-5 w-0.5 h-0.5 rounded-full bg-white transition-opacity duration-500 delay-150 ${isDark ? 'opacity-50' : 'opacity-0'}`} />
      </span>

      {/* Sliding knob */}
      <span
        className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full shadow-md transition-all duration-500 ease-[cubic-bezier(0.68,-0.2,0.27,1.2)] ${
          isDark ? 'translate-x-7 bg-indigo-950' : 'translate-x-0 bg-white'
        }`}
        style={{
          boxShadow: isDark
            ? '0 2px 8px rgba(99, 102, 241, 0.3), inset 0 1px 2px rgba(255,255,255,0.05)'
            : '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255,255,255,0.8)',
        }}
      >
        {isDark ? (
          <Moon className="w-3 h-3 text-indigo-300" />
        ) : (
          <Sun className="w-3 h-3 text-amber-500" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
