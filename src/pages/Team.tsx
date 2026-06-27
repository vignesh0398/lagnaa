import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Plus,
  Settings2,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { FeaturePicker } from '../components/team/FeaturePicker';
import {
  addTeamMember,
  getTeamMembers,
  removeTeamMember,
  updateTeamMember,
  type TeamMember,
} from '../api/team';
import { useAuth } from '../hooks/useAuth';
import {
  DEFAULT_MEMBER_FEATURES,
  MEMBER_ACCESS_SUMMARY,
  MEMBER_FEATURE_OPTIONS,
  type MemberFeature,
} from '../utils/memberFeatures';

function featureLabel(id: MemberFeature): string {
  return MEMBER_FEATURE_OPTIONS.find((f) => f.id === id)?.label ?? id;
}

export function Team() {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [features, setFeatures] = useState<MemberFeature[]>([...DEFAULT_MEMBER_FEATURES]);

  const [resetMember, setResetMember] = useState<TeamMember | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [editFeaturesMember, setEditFeaturesMember] = useState<TeamMember | null>(null);
  const [editFeatures, setEditFeatures] = useState<MemberFeature[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await getTeamMembers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setError('Name, email, and password are required.');
      return;
    }
    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (role === 'member' && !features.length) {
      setError('Enable at least one feature for this member.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addTeamMember({
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        role,
        features: role === 'member' ? features : undefined,
      });
      setSuccess(
        `${trimmedName} can now sign in with ${trimmedEmail.toLowerCase()} at the same site URL you use (localhost or lagnaa.onrender.com).`
      );
      setName('');
      setEmail('');
      setPassword('');
      setFeatures([...DEFAULT_MEMBER_FEATURES]);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member: TeamMember) => {
    try {
      await updateTeamMember(member.id, { active: !member.active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleResetPassword = async () => {
    if (!resetMember) return;
    const trimmedPassword = resetPassword.trim();
    if (trimmedPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateTeamMember(resetMember.id, { password: trimmedPassword });
      setSuccess(`Password reset for ${resetMember.name}. They can sign in with ${resetMember.email} now.`);
      setResetMember(null);
      setResetPassword('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeatures = async () => {
    if (!editFeaturesMember) return;
    if (!editFeatures.length) {
      setError('Enable at least one feature.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateTeamMember(editFeaturesMember.id, { features: editFeatures });
      setSuccess(`Features updated for ${editFeaturesMember.name}. They may need to log in again to see changes.`);
      setEditFeaturesMember(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feature update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: TeamMember) => {
    if (!window.confirm(`Remove ${member.name} from the team?`)) return;
    try {
      await removeTeamMember(member.id);
      setSuccess(`${member.name} removed.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const admins = members.filter((m) => m.role === 'admin').length;
  const active = members.filter((m) => m.active).length;

  if (!isAdmin) return <Navigate to="/home" replace />;

  return (
    <div>
      <Header title="Team" subtitle="Sub-Accounts" onRefresh={load} />

      <div className="space-y-6 p-8">
        <div className="rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 px-5 py-4">
          <p className="text-sm text-accent-cyan/90">
            You are on the <strong>Admin</strong> panel. Add sub-accounts and choose exactly which Lagnaa features each member can access.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Team accounts only work on the <strong className="text-slate-300">same site URL</strong> where you created them
            (e.g. <span className="font-mono text-accent-cyan/80">lagnaa.onrender.com</span> vs localhost).
          </p>
          <p className="mt-2 text-xs text-slate-500">{MEMBER_ACCESS_SUMMARY}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <StatCard label="Team Members" value={members.length} icon={Users} accent="cyan" />
              <StatCard label="Admins" value={admins} icon={Shield} accent="violet" />
              <StatCard label="Active" value={active} icon={UserPlus} accent="emerald" />
            </div>

            <div className="flex justify-end">
              <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs">
                <Plus className="h-4 w-4" />
                Add Sub-Account
              </button>
            </div>

            {showForm && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card space-y-5 p-5">
                <h3 className="font-bold text-white">New Team Member</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="input-field" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-field" />
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="input-field" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                    className="input-field"
                  >
                    <option value="member">Member (custom features)</option>
                    <option value="admin">Admin (full access)</option>
                  </select>
                </div>

                {role === 'member' ? (
                  <FeaturePicker value={features} onChange={setFeatures} />
                ) : (
                  <p className="rounded-xl border border-accent-violet/20 bg-accent-violet/5 px-4 py-3 text-sm text-slate-300">
                    Admins get <strong className="text-white">full access</strong> to every module — no feature checkboxes needed.
                  </p>
                )}

                <button onClick={handleAdd} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Create Account
                </button>
              </motion.div>
            )}

            <div className="space-y-3">
              {members.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card-hover flex flex-wrap items-start justify-between gap-4 p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white">{member.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          member.role === 'admin' ? 'bg-accent-violet/20 text-accent-violet' : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {member.role}
                      </span>
                      {!member.active && (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{member.email}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                      {member.lastLogin && ` · Last login ${new Date(member.lastLogin).toLocaleString()}`}
                    </p>
                    {member.role === 'member' && member.features?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {member.features.map((f) => (
                          <span
                            key={f}
                            className="rounded-full bg-accent-cyan/10 px-2 py-0.5 text-[10px] font-medium text-accent-cyan"
                          >
                            {featureLabel(f)}
                          </span>
                        ))}
                      </div>
                    ) : member.role === 'admin' ? (
                      <p className="mt-2 text-xs text-slate-500">All features enabled</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {member.role !== 'admin' && (
                      <>
                        <button
                          onClick={() => {
                            setEditFeaturesMember(member);
                            setEditFeatures(member.features?.length ? [...member.features] : [...DEFAULT_MEMBER_FEATURES]);
                            setError('');
                          }}
                          className="btn-secondary text-xs"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Features
                        </button>
                        <button
                          onClick={() => {
                            setResetMember(member);
                            setResetPassword('');
                            setError('');
                          }}
                          className="btn-secondary text-xs"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Reset password
                        </button>
                        <button onClick={() => toggleActive(member)} className="btn-secondary text-xs">
                          {member.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDelete(member)} className="btn-secondary text-xs text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {error && (
          <p className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-sm text-accent-emerald">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </p>
        )}

        {resetMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-md p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Reset password</h3>
                <button
                  onClick={() => {
                    setResetMember(null);
                    setResetPassword('');
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-4 text-sm text-slate-400">
                Set a new password for <span className="text-white">{resetMember.name}</span> ({resetMember.email})
              </p>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                className="input-field mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setResetMember(null);
                    setResetPassword('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={handleResetPassword} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Save password
                </button>
              </div>
            </div>
          </div>
        )}

        {editFeaturesMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="glass-card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Member features</h3>
                <button onClick={() => setEditFeaturesMember(null)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-4 text-sm text-slate-400">
                Choose what <span className="text-white">{editFeaturesMember.name}</span> can access in the sidebar.
              </p>
              <FeaturePicker value={editFeatures} onChange={setEditFeatures} />
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setEditFeaturesMember(null)} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSaveFeatures} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save features
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}