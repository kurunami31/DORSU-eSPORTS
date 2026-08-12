import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, asyncHandler } from '../middleware.js';
import { setMatchWinner } from '../matchmaking.js';

const router = Router();

// Record a winner for a match (admin)
router.post('/matches/:id/winner', requireAdmin, asyncHandler(async (req, res) => {
  const { winnerId } = req.body;
  if (!winnerId) return res.status(400).json({ error: 'winnerId is required.' });
  await setMatchWinner(db, req.params.id, winnerId);
  res.json({ ok: true });
}));

export default router;
