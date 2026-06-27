import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TeamMember } from '../api/team';

export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState<TeamMember | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('datacrew_user');
    if (raw) {
      try {
        setUser(JSON.parse(raw) as TeamMember);
      } catch {
        localStorage.removeItem('datacrew_user');
      }
    }
  }, []);

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

  const isAdmin = user?.role === 'admin';

  return { user, logout, updateUser, initials, isLoggedIn: !!user, isAdmin };
}