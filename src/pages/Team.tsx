import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, Plus, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import {
  addTeamMember,
  getTeamMembers,
  removeTeamMember,
  updateTeamMember,
  type TeamMember,
} from '../api/team';

export function Team() {
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
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setSaving(true);
    setError('');
    try {
      await addTeamMember({ name, email, password, role });
      setSuccess(`${name} added to the team.`);
      setName('');
      setEmail('');
      setPassword('');
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

  return (
    <div>
      <Header title="Team" subtitle="Sub-Accounts" onRefresh={load} />

      <div className="space-y-6 p-8">
        <div className="rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 px-5 py-4">
          <p className="text-sm text-accent-cyan/90">
            You are on the <strong>Admin</strong> panel. Add sub-accounts so your team can log in and work together on calls, prompts, and history.
          </p>
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
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card space-y-4 p-5">
                <h3 className="font-bold text-white">New Team Member</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="input-field" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-field" />
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="input-field" />
                  <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'member')} className="input-field">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
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
                  className="glass-card-hover flex flex-wrap items-center justify-between gap-4 p-5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{member.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        member.role === 'admin' ? 'bg-accent-violet/20 text-accent-violet' : 'bg-white/10 text-slate-400'
                      }`}>
                        {member.role}
                      </span>
                      {!member.active && (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{member.email}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                      {member.lastLogin && ` · Last login ${new Date(member.lastLogin).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {member.role !== 'admin' && (
                      <>
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
            <AlertCircle className="h-4 w-4" />{error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-sm text-accent-emerald">
            <CheckCircle2 className="h-4 w-4" />{success}
          </p>
        )}
      </div>
    </div>
  );
}