import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, mockUsers } from './mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// Simulated "registered users" stored in memory (would be backend in production)
const MOCK_PASSWORD = 'Password1'; // All demo users share this password for simplicity

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<(User & { password: string })[]>(
    mockUsers.map(u => ({ ...u, password: MOCK_PASSWORD }))
  );

  // Persist session in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('teammatch_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        sessionStorage.removeItem('teammatch_user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    const found = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      return { success: false, error: 'No existe una cuenta con ese correo electrónico.' };
    }
    if (found.password !== password) {
      return { success: false, error: 'Contraseña incorrecta. Inténtalo de nuevo.' };
    }

    const { password: _pw, ...userWithoutPassword } = found;
    setUser(userWithoutPassword);
    sessionStorage.setItem('teammatch_user', JSON.stringify(userWithoutPassword));
    return { success: true };
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    await new Promise(r => setTimeout(r, 800));

    const exists = registeredUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (exists) {
      return { success: false, error: 'Ya existe una cuenta con ese correo electrónico.' };
    }

    // Password validation
    if (data.password.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
    }
    if (!/[A-Z]/.test(data.password)) {
      return { success: false, error: 'La contraseña debe incluir al menos una letra mayúscula.' };
    }
    if (!/[0-9]/.test(data.password)) {
      return { success: false, error: 'La contraseña debe incluir al menos un número.' };
    }

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
    setUser(userWithoutPassword);
    sessionStorage.setItem('teammatch_user', JSON.stringify(userWithoutPassword));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('teammatch_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
