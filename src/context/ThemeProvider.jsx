import { useEffect, useState } from 'react';
import { ThemeContext } from './themeContextValue';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.add('transitioning');
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);

    const timeout = setTimeout(() => {
      root.classList.remove('transitioning');
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
