import logoSquare from '../assets/logo-square.png';
import { useTheme } from '../context/useTheme';

const LogoSquare = () => (
  <img src={logoSquare} alt="USACO Guide Logo" className="h-8 w-8" />
);

const NavBar = () => {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center space-x-4">
        <div className="mr-8 flex flex-nowrap items-center space-x-2 whitespace-nowrap py-2">
          <div className="h-8 w-8 shrink-0">
            <LogoSquare />
          </div>
          <a
            href="https://usaco.guide"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="text-xl font-medium tracking-tight">
              Guide Graph Visualizer
            </span>
          </a>
        </div>
      </div>

      <button
        onClick={toggleTheme}
        className="dark:hover:text-dark-high-emphasis focus:outline-hidden -mx-1 rounded-full border-2 border-transparent p-1 text-gray-400 transition hover:text-gray-300 focus:bg-gray-100 focus:text-gray-500 dark:text-gray-400 dark:focus:bg-gray-700"
        aria-label="Toggle theme"
      >
        {isDarkMode ? (
          <svg
            className="h-6 w-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>
    </div>
  );
};

export default NavBar;
