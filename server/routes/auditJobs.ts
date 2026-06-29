import { Router } from 'express';
import { getAuditJob } from '../auditJobs.js';

const router = Router();

router.get('/:id', (req, res) => {
  const job = getAuditJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Audit job not found or expired.' });
  res.json({
    id: job.id,
    status: job.status,
    result: job.status === 'done' ? job.result : undefined,
    error: job.status === 'error' ? job.error : undefined,
  });
});

export default router;