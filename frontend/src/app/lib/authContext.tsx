import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, mockUsers } from './mockData';
import { getApiBaseUrl, isApiEnabled } from './config';
import { setAuthToken, getAuthToken } from './apiClient';

interface ProfileUpdate {
  name?: string;
  bio: string;
  roleOrProgram: string;
  yearsExperience: number;
  skills: { id: string; name: string; level: string; category: string }[];
  interests: string[];
  hoursPerWeek: number;
  preferredTimes: string[];
  workTypes: string[];
  userType?: 'student' | 'professional' | null;
  avatar?: string | null; // null = deleted, undefined = unchanged, string = new photo
}

interface AuthContextType {
  user: User | null;
  authToken: string | null;
  isAuthenticated: boolean;
  isNewUser: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateOnboarding: (data: ProfileUpdate) => Promise<void>;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
}

interface RegisterData { name: string; email: string; password: string; }

const MOCK_PASSWORD = 'Password1';
const STORAGE_KEY   = 'teammatch_user';
const USERS_KEY     = 'teammatch_registered_users';
const AVATAR_KEY    = (id: string) => `teammatch_avatar_${id}`;

const AuthContext = createContext<AuthContextType | null>(null);

// ── avatar helpers (stored separately to avoid localStorage size limits) ──
function saveAvatar(userId: string, base64: string | null) {
  const key = AVATAR_KEY(userId);
  if (base64) {
    try { localStorage.setItem(key, base64); } catch { /* quota exceeded — skip */ }
  } else {
    localStorage.removeItem(key);
  }
}
function loadAvatar(userId: string): string | undefined {
  return localStorage.getItem(AVATAR_KEY(userId)) ?? undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [authToken, setAuthTokenState] = useState<string | null>(() => getAuthToken());
  const [isNewUser, setIsNewUser] = useState(false);

  const [registeredUsers, setRegisteredUsers] = useState<(User & { password: string })[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as (User & { password: string })[];
        const mockWithPw = mockUsers.map(u => ({ ...u, password: MOCK_PASSWORD }));
        const emails = new Set(mockWithPw.map(u => u.email.toLowerCase()));
        const extra  = parsed.filter(u => !emails.has(u.email.toLowerCase()));
        return [...mockWithPw, ...extra];
      }
    } catch { /* ignore */ }
    return mockUsers.map(u => ({ ...u, password: MOCK_PASSWORD }));
  });

  // Restore session on mount — also reattach avatar from its own key
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: User = JSON.parse(saved);
        parsed.avatar = loadAvatar(parsed.id);
        setUser(parsed);
      }
    } catch { localStorage.removeItem(STORAGE_KEY); }
  }, []);

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(
      // Don't persist avatar in the users list (stored separately)
      registeredUsers.map(u => ({ ...u, avatar: undefined }))
    ));
  }, [registeredUsers]);

  // ── internal helpers ────────────────────────────────────────────────────

  const persistUser = (u: User) => {
    setUser(u);
    // Save user without avatar in main key, avatar in its own key
    const { avatar, ...userWithoutAvatar } = u;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithoutAvatar));
    if (avatar !== undefined) saveAvatar(u.id, avatar ?? null);
  };

  const syncRegisteredUser = (updated: User) => {
    setRegisteredUsers(prev =>
      prev.map(u => u.id === updated.id ? { ...u, ...updated, avatar: undefined } : u)
    );
  };

  const buildUpdatedUser = (base: User, data: ProfileUpdate): User => {
    const updated: User = {
      ...base,
      ...(data.name !== undefined ? { name: data.name } : {}),
      bio:        data.bio,
      skills:     data.skills as User['skills'],
      interests:  data.interests,
      experience: data.yearsExperience,
      availability: {
        hoursPerWeek:   data.hoursPerWeek,
        preferredTimes: data.preferredTimes,
      },
    };
    // Handle avatar: null = delete, string = new photo, undefined = keep existing
    if (data.avatar === null) {
      updated.avatar = undefined;
    } else if (typeof data.avatar === 'string') {
      updated.avatar = data.avatar;
    } else {
      updated.avatar = base.avatar; // unchanged
    }
    return updated;
  };

  // ── public actions ──────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (isApiEnabled()) {
      try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (res.ok) {
          const data = (await res.json()) as { token: string };
          setAuthToken(data.token);
          setAuthTokenState(data.token);
        }
      } catch {
        /* continúa con mock si falla la red */
      }
    }

    await new Promise(r => setTimeout(r, 800));
    const found = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found)              return { success: false, error: 'No existe una cuenta con ese correo electrónico.' };
    if (found.password !== password) return { success: false, error: 'Contraseña incorrecta.' };
    const { password: _pw, ...u } = found;
    u.avatar = loadAvatar(u.id);
    persistUser(u);
    return { success: true };
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    await new Promise(r => setTimeout(r, 800));
    if (registeredUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase()))
      return { success: false, error: 'Ya existe una cuenta con ese correo electrónico.' };
    if (data.password.length < 8)     return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
    if (!/[A-Z]/.test(data.password)) return { success: false, error: 'Debe incluir al menos una mayúscula.' };
    if (!/[0-9]/.test(data.password)) return { success: false, error: 'Debe incluir al menos un número.' };

    const newUser: User & { password: string } = {
      id: `u_${Date.now()}`, name: data.name, email: data.email, password: data.password,
      bio: '', skills: [], interests: [], experience: 0,
      availability: { hoursPerWeek: 0, preferredTimes: [] },
      completedProjects: 0, rating: 0, joinedDate: new Date().toISOString().split('T')[0],
    };
    setRegisteredUsers(prev => [...prev, newUser]);
    const { password: _pw, ...u } = newUser;
    persistUser(u);
    setIsNewUser(true);
    return { success: true };
  };

  const updateOnboarding = async (data: ProfileUpdate): Promise<void> => {
    await new Promise(r => setTimeout(r, 600));
    if (!user) return;
    const updated = buildUpdatedUser(user, data);
    if (data.avatar === null) saveAvatar(user.id, null);
    else if (typeof data.avatar === 'string') saveAvatar(user.id, data.avatar);
    persistUser(updated);
    syncRegisteredUser(updated);
    setIsNewUser(false);
  };

  const updateProfile = async (data: ProfileUpdate): Promise<void> => {
    await new Promise(r => setTimeout(r, 400));
    if (!user) return;
    const updated = buildUpdatedUser(user, data);
    if (data.avatar === null) saveAvatar(user.id, null);
    else if (typeof data.avatar === 'string') saveAvatar(user.id, data.avatar);
    persistUser(updated);
    syncRegisteredUser(updated);
  };

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    setAuthTokenState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, authToken, isAuthenticated: !!user, isNewUser, login, register, logout, updateOnboarding, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}