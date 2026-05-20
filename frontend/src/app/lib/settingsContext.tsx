import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface NotificationSettings {
  projectMatches: boolean;
  taskReminders: boolean;
  teamUpdates: boolean;
  weeklyDigest: boolean;
}

export interface PrivacySettings {
  visibleInMatchmaking: boolean;
  showEmailToTeam: boolean;
}

export interface ExperienceSettings {
  compactLayout: boolean;
  reduceMotion: boolean;
  showMatchScores: boolean;
}

export interface AppSettings {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  experience: ExperienceSettings;
  language: 'es';
}

const STORAGE_KEY = 'teammatch_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    projectMatches: true,
    taskReminders: true,
    teamUpdates: true,
    weeklyDigest: false,
  },
  privacy: {
    visibleInMatchmaking: true,
    showEmailToTeam: false,
  },
  experience: {
    compactLayout: false,
    reduceMotion: false,
    showMatchScores: true,
  },
  language: 'es',
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
      privacy: { ...DEFAULT_SETTINGS.privacy, ...parsed.privacy },
      experience: { ...DEFAULT_SETTINGS.experience, ...parsed.experience },
      language: 'es',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyExperienceToDocument(experience: ExperienceSettings) {
  const root = document.documentElement;
  root.classList.toggle('reduce-motion', experience.reduceMotion);
  if (experience.compactLayout) {
    root.dataset.compact = 'true';
  } else {
    root.removeAttribute('data-compact');
  }
}

type SettingsUpdate =
  | Partial<AppSettings>
  | ((prev: AppSettings) => Partial<AppSettings>);

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (update: SettingsUpdate) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadSettings();
    applyExperienceToDocument(loaded.experience);
    return loaded;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* quota */
    }
    applyExperienceToDocument(settings.experience);
  }, [settings]);

  const updateSettings = useCallback((update: SettingsUpdate) => {
    setSettings((prev) => {
      const patch = typeof update === 'function' ? update(prev) : update;
      return {
        ...prev,
        ...patch,
        notifications: patch.notifications
          ? { ...prev.notifications, ...patch.notifications }
          : prev.notifications,
        privacy: patch.privacy
          ? { ...prev.privacy, ...patch.privacy }
          : prev.privacy,
        experience: patch.experience
          ? { ...prev.experience, ...patch.experience }
          : prev.experience,
        language: 'es',
      };
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings debe usarse dentro de SettingsProvider');
  }
  return ctx;
}
