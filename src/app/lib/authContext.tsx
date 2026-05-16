import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, mockUsers } from './mockData';

interface ProfileUpdate {
  bio: string;
  roleOrProgram: string;
  yearsExperience: number;
  skills: { id: string; name: string; level: string; category: string }[];
  interests: string[];
  hoursPerWeek: number;
  preferredTimes: string[];
  workTypes: string[];
  userType?: 'student' | 'professional' | null;
  avatar?: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isNewUser: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateOnboarding: (data: ProfileUpdate) => Promise<void>;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

const MOCK_PASSWORD = 'Password1';
const STORAGE_KEY   = 'teammatch_user';
const USERS_KEY     = 'teammatch_registered_users';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<(User & { password: string })[]>(() => {
    // Load persisted registered users so new accounts survive refresh
    try {
      const saved = localStorage.getItem(USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as (User & { password: string })[];
        // Merge with mock users (avoid duplicates by email)
        const mockWithPw = mockUsers.map(u => ({ ...u, password: MOCK_PASSWORD }));
        const emails = new Set(mockWithPw.map(u => u.email.toLowerCase()));
        const extra = parsed.filter(u => !emails.has(u.email.toLowerCase()));
        return [...mockWithPw, ...extra];
      }
    } catch { /* ignore */ }
    return mockUsers.map(u => ({ ...u, password: MOCK_PASSWORD }));
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setUser(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Persist registered users whenever the list changes
  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  // ── helpers ──────────────────────────────────────────────────────────────

  const persistUser = (u: User) => {
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const syncRegisteredUser = (updated: User) => {
    setRegisteredUsers(prev =>
      prev.map(u => u.id === updated.id ? { ...u, ...updated } : u)
    );
  };

  const buildUpdatedUser = (base: User, data: ProfileUpdate): User => ({
    ...base,
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
    bio:      data.bio,
    skills:   data.skills as User['skills'],
    interests: data.interests,
    experience: data.yearsExperience,
    availability: {
      hoursPerWeek:   data.hoursPerWeek,
      preferredTimes: data.preferredTimes,
    },
  });

  // ── auth actions ─────────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise(r => setTimeout(r, 800));
    const found = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { success: false, error: 'No existe una cuenta con ese correo electrónico.' };
    if (found.password !== password) return { success: false, error: 'Contraseña incorrecta. Inténtalo de nuevo.' };
    const { password: _pw, ...userWithoutPassword } = found;
    persistUser(userWithoutPassword);
    return { success: true };
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    await new Promise(r => setTimeout(r, 800));
    const exists = registeredUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (exists) return { success: false, error: 'Ya existe una cuenta con ese correo electrónico.' };
    if (data.password.length < 8)         return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
    if (!/[A-Z]/.test(data.password))     return { success: false, error: 'La contraseña debe incluir al menos una letra mayúscula.' };
    if (!/[0-9]/.test(data.password))     return { success: false, error: 'La contraseña debe incluir al menos un número.' };

    const newUser: User & { password: string } = {
      id: `u_${Date.now()}`,
      name: data.name,
      email: data.email,
      password: data.password,
      bio: '',
      skills: [],
      interests: [],
      experience: 0,
      availability: { hoursPerWeek: 0, preferredTimes: [] },
      completedProjects: 0,
      rating: 0,
      joinedDate: new Date().toISOString().split('T')[0],
    };

    setRegisteredUsers(prev => [...prev, newUser]);
    const { password: _pw, ...userWithoutPassword } = newUser;
    persistUser(userWithoutPassword);
    setIsNewUser(true);
    return { success: true };
  };

  const updateOnboarding = async (data: ProfileUpdate): Promise<void> => {
    await new Promise(r => setTimeout(r, 600));
    if (!user) return;
    const updated = buildUpdatedUser(user, data);
    persistUser(updated);
    syncRegisteredUser(updated);
    setIsNewUser(false);
  };

  // updateProfile is the same logic but no isNewUser side-effect
  const updateProfile = async (data: ProfileUpdate): Promise<void> => {
    await new Promise(r => setTimeout(r, 400));
    if (!user) return;
    const updated = buildUpdatedUser(user, data);
    persistUser(updated);
    syncRegisteredUser(updated);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isNewUser, login, register, logout, updateOnboarding, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}