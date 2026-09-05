import { useLayoutEffect, useState } from 'react';
import { ThemeContext } from './themeContextValue';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';

  let savedTheme;
  try {
    savedTheme = localStorage.getItem('theme');
  } catch {
    /* Storage may be disabled. */
  }
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    const root = window.document.documentElement;

    root.classList.add('transitioning');
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    root.dataset.themeReady = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* Theme remains usable without storage. */
    }

    const timeout = setTimeout(() => {
      root.classList.remove('transitioning');
      root.classList.remove('theme-preload');
    }, 50);

    return () => clearTimeout(timeout);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isLoaded: true }}>
      {children}
    </ThemeContext.Provider>
  );
};
