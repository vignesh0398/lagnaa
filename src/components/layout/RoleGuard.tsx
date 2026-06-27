import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { canAccessPath } from '../../utils/roleAccess';

export function RoleGuard() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || canAccessPath(user, pathname)) return;
    navigate('/home', { replace: true, state: { accessDenied: true } });
  }, [pathname, user, navigate]);

  if (user && !canAccessPath(user, pathname)) {
    return null;
  }

  return <Outlet />;
}