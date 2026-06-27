import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { AlertCircle, ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';
import { LagnaaLogo } from '../components/brand/LagnaaLogo';
import { API_OFFLINE_MESSAGE, checkApiHealth } from '../api/fetchJson';
import { loginTeam } from '../api/team';
import { useAuth } from '../hooks/useAuth';
import {
  BRAND_ASSISTANT,
  BRAND_BYLINE,
  BRAND_LOGIN_SPARKLE,
  BRAND_NAME,
  BRAND_TAGLINE,
} from '../constants/brand';

function FloatingOrb({ className, delay }: { className: string; delay: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${className}`}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{ duration: 8, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

export function Login() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiOffline, setApiOffline] = useState(false);

  useEffect(() => {
    void checkApiHealth().then((ok) => setApiOffline(!ok));
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [8, -8]), { stiffness: 120, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-8, 8]), { stiffness: 120, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await loginTeam(email.trim(), password.trim());
      updateUser(user);
      setSuccess(true);
      setTimeout(() => navigate('/home'), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-page-bg relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-950 bg-mesh" style={{ perspective: 1200 }}>
      <div className="absolute inset-0 bg-mesh" />
      <FloatingOrb className="left-1/4 top-1/4 h-72 w-72 bg-accent-cyan/20" delay={0} />
      <FloatingOrb className="right-1/4 bottom-1/4 h-96 w-96 bg-accent-cyan/12" delay={2} />
      <FloatingOrb className="left-1/2 top-1/2 h-48 w-48 bg-accent-cyan/8" delay={4} />

      {/* Grid floor effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(251,191,36,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.12) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          transform: 'perspective(500px) rotateX(60deg) scale(2)',
          transformOrigin: 'center bottom',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex justify-center">
            <LagnaaLogo size={104} blend animated />
          </div>
          <h1 className="text-3xl font-bold text-white">
            Welcome to <span className="gradient-text">{BRAND_NAME}</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-300">{BRAND_TAGLINE}</p>
          <p className="mt-1 text-xs text-slate-500">{BRAND_BYLINE}</p>
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mt-3 flex items-center justify-center gap-1 text-xs text-accent-cyan"
          >
            <Sparkles className="h-3 w-3" />
            {BRAND_LOGIN_SPARKLE}
          </motion.p>
          <p className="mt-1 text-[10px] text-slate-600">
            Meet <span className="text-amber-400/90">{BRAND_ASSISTANT}</span> — tap the bee for help anytime
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, z: -100 }}
          animate={{ opacity: 1, z: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            mouseX.set(0);
            mouseY.set(0);
          }}
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        >
        <motion.form
          onSubmit={handleLogin}
          style={{ transform: 'translateZ(60px)' }}
          className={`glass-card relative space-y-5 overflow-hidden p-8 ${
            success ? 'ring-2 ring-accent-emerald/50' : ''
          }`}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-cyan/8 via-transparent to-accent-cyan/4"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          <div className="relative">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@datacrew.ai"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div className="relative">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          {apiOffline && (
            <div className="relative rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-200">
              <p className="font-semibold text-amber-300">API server is not running</p>
              <p className="mt-1 break-words text-amber-200/90">{API_OFFLINE_MESSAGE}</p>
            </div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative flex items-center gap-2 text-sm text-red-400"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.p>
          )}

          {success && (
            <motion.p
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative text-center text-sm font-semibold text-accent-emerald"
            >
              Welcome back — entering dashboard...
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading || success}
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(251,191,36,0.35)' }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary relative w-full overflow-hidden"
          >
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? 'Signing in...' : success ? 'Success!' : 'Sign In'}
              {!loading && !success && <ArrowRight className="h-4 w-4" />}
            </span>
          </motion.button>

          <p className="relative text-center text-[10px] text-slate-600">
            Contact your administrator if you need access.
          </p>
        </motion.form>
        </motion.div>
      </div>
    </div>
  );
}