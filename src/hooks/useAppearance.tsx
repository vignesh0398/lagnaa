import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './useAuth';
import {
  applyAppearanceToDocument,
  DEFAULT_APPEARANCE,
  loadAppearance,
  saveAppearance,
  type AppearanceSettings,
} from '../utils/appearance';

interface AppearanceContextValue {
  settings: AppearanceSettings;
  updateSettings: (patch: Partial<AppearanceSettings>) => void;
  resetSettings: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppearanceSettings>(() => loadAppearance(user?.id));

  useEffect(() => {
    const next = loadAppearance(user?.id);
    setSettings(next);
    applyAppearanceToDocument(next);
  }, [user?.id]);

  useEffect(() => {
    applyAppearanceToDocument(settings);
    saveAppearance(settings, user?.id);
  }, [settings, user?.id]);

  const updateSettings = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_APPEARANCE });
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error('useAppearance must be used within AppearanceProvider');
  }
  return ctx;
}