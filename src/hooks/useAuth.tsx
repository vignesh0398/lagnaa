import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TeamMember } from '../api/team';

function readStoredUser(): TeamMember | null {
  try {
    const raw = localStorage.getItem('datacrew_user');
    if (!raw) return null;
    return JSON.parse(raw) as TeamMember;
  } catch {
    localStorage.removeItem('datacrew_user');
    return null;
  }
}

type AuthContextValue = {
  user: TeamMember | null;
  logout: () => void;
  updateUser: (member: TeamMember) => void;
  initials: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<TeamMember | null>(readStoredUser);

  const logout = useCallback(() => {
    localStorage.removeItem('datacrew_user');
    setUser(null);
    navigate('/');
  }, [navigate]);

  const updateUser = useCallback((member: TeamMember) => {
    localStorage.setItem('datacrew_user', JSON.stringify(member));
    setUser(member);
  }, []);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'DC';

  const value: AuthContextValue = {
    user,
    logout,
    updateUser,
    initials,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}