
import React from 'react';

// Simplified theme provider - light mode only
interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return <>{children}</>;
};

// Dummy hook for compatibility - always returns light theme
export const useTheme = () => {
  return {
    theme: 'light' as const,
    setTheme: () => {},
    toggleTheme: () => {},
  };
};
