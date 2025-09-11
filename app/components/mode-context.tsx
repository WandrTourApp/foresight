'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Mode = 'shop' | 'sales';

interface ModeContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

interface ModeProviderProps {
  children: ReactNode;
}

export function ModeProvider({ children }: ModeProviderProps) {
  const [mode, setModeState] = useState<Mode>('shop');

  // Load mode from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fs:mode');
      if (saved && ['shop', 'sales'].includes(saved)) {
        setModeState(saved as Mode);
      }
    }
  }, []);

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fs:mode', newMode);
    }
  };

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}

// Visibility matrix
export function allowedPages(mode: Mode): string[] {
  switch (mode) {
    case 'shop':
      return ['timeline-v2', 'picklist', 'lamination', 'tracker'];
    case 'sales':
      return ['sales'];
    default:
      return ['timeline-v2'];
  }
}