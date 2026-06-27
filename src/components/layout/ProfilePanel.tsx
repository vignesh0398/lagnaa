import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Cable,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  LogOut,
  Shield,
  User,
  Users,
  Webhook,
  X,
} from 'lucide-react';
import { changePassword, getProfile, updateProfile } from '../../api/team';
import { useAuth } from '../../hooks/useAuth';

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

function formatLastLogin(value?: string): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const navigate = useNavigate();
  const { user, logout, updateUser, initials } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [lastLogin, setLastLogin] = useState<string | undefined>();

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (!open || !user) return;

    setProfileSuccess('');
    setPasswordError('');
    setPasswordSuccess('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setProfileError('');
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setLastLogin(user.lastLogin);

    if (!user.id) return;

    let cancelled = false;
    setRefreshing(true);

    getProfile(user.id)
      .then((member) => {
        if (cancelled) return;
        setName(member.name);
        setEmail(member.email);
        setRole(member.role);
        setLastLogin(member.lastLogin);
      })
      .catch((err) => {
        if (cancelled) return;
        setProfileError(err instanceof Error ? err.message : 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    if (!name.trim() || !email.trim()) {
      setProfileError('Name and email are required.');
      return;
    }

    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const member = await updateProfile({
        userId: user.id,
        name: name.trim(),
        email: email.trim(),
      });
      updateUser(member);
      setProfileSuccess('Profile updated.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Profile update failed');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.id) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      await changePassword({
        userId: user.id,
        currentPassword,
        newPassword,
      });
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setPasswordSaving(false);
    }
  };

  const goTo = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 480 }}
            className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-md flex-col border-l border-white/10 bg-surface-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{user?.name ?? 'Profile'}</p>
                  <p className="text-xs text-slate-500">{user?.email ?? ''}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close profile"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {refreshing && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-2 text-xs text-accent-cyan">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refreshing profile…
                </div>
              )}

              <div className="space-y-6">
                  <section className="glass-card space-y-4 p-5">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-accent-cyan" />
                      <h3 className="text-sm font-semibold text-white">Profile details</h3>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                        Full name
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-field"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                        Email
                      </label>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        className="input-field"
                        placeholder="you@company.com"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm capitalize text-white">
                          <Shield className="h-3.5 w-3.5 text-accent-violet" />
                          {role}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last login</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          {formatLastLogin(lastLogin)}
                        </p>
                      </div>
                    </div>

                    {profileError && (
                      <p className="flex items-center gap-2 text-sm text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {profileError}
                      </p>
                    )}
                    {profileSuccess && (
                      <p className="flex items-center gap-2 text-sm text-accent-emerald">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {profileSuccess}
                      </p>
                    )}

                    <button onClick={handleSaveProfile} disabled={profileSaving} className="btn-primary w-full">
                      {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save profile
                    </button>
                  </section>

                  <section className="glass-card space-y-4 p-5">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-accent-pink" />
                      <h3 className="text-sm font-semibold text-white">Change password</h3>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                        Current password
                      </label>
                      <input
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        type="password"
                        className="input-field"
                        autoComplete="current-password"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                        New password
                      </label>
                      <input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        type="password"
                        className="input-field"
                        autoComplete="new-password"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                        Confirm new password
                      </label>
                      <input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type="password"
                        className="input-field"
                        autoComplete="new-password"
                      />
                    </div>

                    {passwordError && (
                      <p className="flex items-center gap-2 text-sm text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {passwordError}
                      </p>
                    )}
                    {passwordSuccess && (
                      <p className="flex items-center gap-2 text-sm text-accent-emerald">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {passwordSuccess}
                      </p>
                    )}

                    <button onClick={handleChangePassword} disabled={passwordSaving} className="btn-secondary w-full">
                      {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      Update password
                    </button>
                  </section>

                  <section className="glass-card space-y-2 p-3">
                    <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">Quick links</p>

                    {role === 'admin' && (
                      <button
                        onClick={() => goTo('/team')}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                      >
                        <Users className="h-4 w-4 text-accent-violet" />
                        Team management
                      </button>
                    )}

                    <button
                      onClick={() => goTo('/gateway')}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      <Cable className="h-4 w-4 text-accent-cyan" />
                      Connections
                    </button>

                    <button
                      onClick={() => goTo('/integrations')}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      <Webhook className="h-4 w-4 text-accent-emerald" />
                      API & Webhooks
                    </button>

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </section>
                </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}