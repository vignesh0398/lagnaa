import { Router } from 'express';
import {
  authenticate,
  changePassword,
  createMember,
  deleteMember,
  getMemberById,
  listTeam,
  updateMember,
  updateProfile,
} from '../teamStore.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  const user = authenticate(email, password);
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

  res.json({ success: true, user });
});

router.get('/', (_req, res) => {
  res.json({ members: listTeam() });
});

router.get('/profile/:id', (req, res) => {
  const member = getMemberById(req.params.id);
  if (!member) return res.status(404).json({ error: 'User not found' });
  res.json({ member });
});

router.put('/profile', (req, res) => {
  try {
    const { userId, name, email } = req.body as {
      userId?: string;
      name?: string;
      email?: string;
    };
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const member = updateProfile(userId, { name, email });
    res.json({ success: true, member });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Update failed' });
  }
});

router.post('/profile/password', (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body as {
      userId?: string;
      currentPassword?: string;
      newPassword?: string;
    };
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'userId, currentPassword, and newPassword are required' });
    }
    changePassword(userId, currentPassword, newPassword);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Password change failed' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, email, password, role, features } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: 'admin' | 'member';
      features?: string[];
    };
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    const member = createMember({ name, email, password, role, features: features as never });
    res.json({ success: true, member });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Create failed' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const member = updateMember(req.params.id, req.body);
    res.json({ success: true, member });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Update failed' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    deleteMember(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Delete failed' });
  }
});

export default router;