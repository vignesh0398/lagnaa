import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AmbientMusicPlayer } from '../home/AmbientMusicPlayer';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('datacrew_user')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="theme-page-bg min-h-screen bg-mesh">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <Outlet />
      </main>
      <AmbientMusicPlayer />
    </div>
  );
}