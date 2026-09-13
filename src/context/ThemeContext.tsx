import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'aurora';

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  mutedText: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  border: string;
  input: string;
  ring: string;
  bubbleSent: string;
  bubbleSentText: string;
  bubbleReceived: string;
  bubbleReceivedText: string;
  chatPatternOpacity: number;
}

export const THEMES: Record<ThemeMode, ThemeColors> = {
  light: {
    background: '#efeae2',
    foreground: '#111b21',
    primary: '#00a884',
    secondary: '#25d366',
    accent: '#00a884',
    muted: '#f0f2f5',
    mutedText: '#667781',
    card: '#ffffff',
    cardForeground: '#111b21',
    popover: '#ffffff',
    popoverForeground: '#111b21',
    border: '#e9edef',
    input: '#f0f2f5',
    ring: '#00a884',
    bubbleSent: '#d9fdd3',
    bubbleSentText: '#111b21',
    bubbleReceived: '#ffffff',
    bubbleReceivedText: '#111b21',
    chatPatternOpacity: 0.06,
  },
  dark: {
    background: '#0f172a',
    foreground: '#f8fafc',
    primary: '#8b5cf6',
    secondary: '#ec4899',
    accent: '#8b5cf6',
    muted: '#1e293b',
    mutedText: '#94a3b8',
    card: '#1e293b',
    cardForeground: '#f8fafc',
    popover: '#1e293b',
    popoverForeground: '#f8fafc',
    border: '#334155',
    input: '#0f172a',
    ring: '#8b5cf6',
    bubbleSent: '#8b5cf6',
    bubbleSentText: '#ffffff',
    bubbleReceived: '#1e293b',
    bubbleReceivedText: '#f8fafc',
    chatPatternOpacity: 0.05,
  },
  aurora: {
    background: '#0f172a',
    foreground: '#e0f7fa',
    primary: '#00bcd4',
    secondary: '#ff4081',
    accent: '#4caf50',
    muted: '#1e293b',
    mutedText: '#94a3b8',
    card: '#1e293b',
    cardForeground: '#e0f2f1',
    popover: '#1e293b',
    popoverForeground: '#e0f2f1',
    border: '#334155',
    input: '#0f172a',
    ring: '#00bcd4',
    bubbleSent: '#1e3a5f',
    bubbleSentText: '#e0f7fa',
    bubbleReceived: '#1e293b',
    bubbleReceivedText: '#e0f7fa',
    chatPatternOpacity: 0.05,
  },
};

interface ThemeContextType {
  mode: ThemeMode;
  theme: ThemeColors;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  theme: THEMES.dark,
  setTheme: () => {},
});

const STORAGE_KEY = 'chatTheme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'aurora')) {
        setModeState(saved as ThemeMode);
      }
    });
  }, []);

  const setTheme = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(console.error);
  };

  return (
    <ThemeContext.Provider value={{ mode, theme: THEMES[mode], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
