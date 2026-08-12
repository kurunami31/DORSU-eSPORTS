import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, asyncHandler } from '../middleware.js';
import { ValidationError } from '../validate.js';
import { setMatchWinner } from '../matchmaking.js';

const router = Router();

// Record a winner for a match (admin)
router.post('/matches/:id/winner', requireAdmin, asyncHandler(async (req, res) => {
  const winnerId = Number(req.body.winnerId);
  if (!Number.isInteger(winnerId) || winnerId <= 0) {
    throw new ValidationError('winnerId must be a positive integer.');
  }
  await setMatchWinner(db, req.params.id, winnerId);
  res.json({ ok: true });
}));

export default router;
