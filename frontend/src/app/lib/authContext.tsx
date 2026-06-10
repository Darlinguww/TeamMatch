import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, mockUsers } from './mockData';
import { ApiError, authApi, getStoredToken, setStoredToken } from './apiClient';
import { buildExperiencePayload, profileApi } from './profileApi';
import { mapApiCategory } from './skillCatalog';

const USE_API_AUTH = import.meta.env.VITE_USE_API_AUTH === 'true';

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
    const restore = async () => {
      if (USE_API_AUTH && getStoredToken()) {
        try {
          const { user: me } = await authApi.me();
          const displayName = (me.user?.trim() || me.email.split('@')[0] || 'Usuario');
          let restored: User = {
            id: me.userId,
            name: displayName,
            email: me.email,
            bio: '',
            skills: [],
            interests: [],
            experience: 0,
            availability: { hoursPerWeek: 0, preferredTimes: [] },
            completedProjects: 0,
            rating: 0,
            joinedDate: new Date().toISOString().split('T')[0]
          };
          try {
            const { profile } = await profileApi.getProfile(me.userId);
            const totalYears = (profile.experience ?? []).reduce(
              (sum, e) => sum + (e.yearsOfExperience ?? 0),
              0
            );
            restored = {
              ...restored,
              skills: (profile.skills ?? []).map((name, i) => ({
                id: `sk_${i}`,
                name,
                category: mapApiCategory(),
                level: 'intermediate' as const,
              })),
              experience: Math.round(totalYears / Math.max(profile.skills?.length ?? 1, 1)),
            };
          } catch {
            /* perfil vacío en Neo4j */
          }
          restored.avatar = loadAvatar(restored.id);
          setUser(restored);
          return;
        } catch {
          setStoredToken(null);
        }
      }

      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: User = JSON.parse(saved);
          parsed.avatar = loadAvatar(parsed.id);
          setUser(parsed);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    void restore();
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
    if (USE_API_AUTH) {
      try {
        const { token } = await authApi.login({ email, password });
        setStoredToken(token);
        const { user: me } = await authApi.me();
        const displayName = (me.user?.trim() || me.email.split('@')[0] || 'Usuario');
        const restored: User = {
          id: me.userId,
          name: displayName,
          email: me.email,
          bio: '',
          skills: [],
          interests: [],
          experience: 0,
          availability: { hoursPerWeek: 0, preferredTimes: [] },
          completedProjects: 0,
          rating: 0,
          joinedDate: new Date().toISOString().split('T')[0]
        };
        try {
          const { profile } = await profileApi.getProfile(me.userId);
          restored.skills = (profile.skills ?? []).map((name, i) => ({
            id: `sk_${i}`,
            name,
            category: mapApiCategory(),
            level: 'intermediate',
          }));
        } catch {
          /* sin perfil aún */
        }
        persistUser(restored);
        return { success: true };
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'No se pudo iniciar sesión.';
        return { success: false, error: message };
      }
    }

    const found = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found)              return { success: false, error: 'No existe una cuenta con ese correo electrónico.' };
    if (found.password !== password) return { success: false, error: 'Contraseña incorrecta.' };
    const { password: _pw, ...u } = found;
    u.avatar = loadAvatar(u.id);
    persistUser(u);
    return { success: true };
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    if (USE_API_AUTH) {
      try {
        await authApi.register({ email: data.email, password: data.password, user: data.name });
        const loginResult = await login(data.email, data.password);
        if (loginResult.success) {
          setIsNewUser(true);
          setUser((prev) => (prev ? { ...prev, name: data.name.trim() } : prev));
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            try {
              const parsed = JSON.parse(saved) as User;
              localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, name: data.name.trim() }));
            } catch {
              /* ignore */
            }
          }
        }
        return loginResult;
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'No se pudo registrar la cuenta.';
        return { success: false, error: message };
      }
    }

    if (registeredUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase()))
      return { success: false, error: 'Ya existe una cuenta con ese correo electrónico.' };
    if (data.password.length < 8)     return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
    if (!/[A-Z]/.test(data.password)) return { success: false, error: 'Debe incluir al menos una mayúscula.' };
    if (!/[0-9]/.test(data.password)) return { success: false, error: 'Debe incluir al menos un número.' };

    const newUser: User & { password: string } = {
      id: `u_${Date.now()}`,
      name: data.name.trim(),
      email: data.email,
      password: data.password,
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

  const syncProfileToApi = async (data: ProfileUpdate): Promise<void> => {
    if (!USE_API_AUTH || !getStoredToken()) return;
    const skillNames = data.skills
      .map((s) => s.name.trim())
      .filter((name) => name.length > 0);
    await profileApi.updateSkills(skillNames);
    await profileApi.updateExperience(
      buildExperiencePayload(data.skills as User['skills'], data.yearsExperience)
    );
  };

  const updateOnboarding = async (data: ProfileUpdate): Promise<void> => {
    if (!user) return;
    const updated = buildUpdatedUser(user, data);
    if (data.avatar === null) saveAvatar(user.id, null);
    else if (typeof data.avatar === 'string') saveAvatar(user.id, data.avatar);
    if (USE_API_AUTH) {
      await syncProfileToApi(data);
    }
    persistUser(updated);
    syncRegisteredUser(updated);
    setIsNewUser(false);
  };

  const updateProfile = async (data: ProfileUpdate): Promise<void> => {
    if (!user) return;
    const updated = buildUpdatedUser(user, data);
    if (data.avatar === null) saveAvatar(user.id, null);
    else if (typeof data.avatar === 'string') saveAvatar(user.id, data.avatar);
    if (USE_API_AUTH) {
      await syncProfileToApi(data);
    }
    persistUser(updated);
    syncRegisteredUser(updated);
  };

  const logout = () => {
    setUser(null);
    setStoredToken(null);
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