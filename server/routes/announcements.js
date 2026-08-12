import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, asyncHandler } from '../middleware.js';

const router = Router();

const CATEGORIES = ['Tournament', 'General', 'Community', 'Patch'];

// List announcements (pinned first, newest first)
router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const category = req.query.category;
  const rows = category
    ? await db.all(
        'SELECT * FROM announcements WHERE category = ? ORDER BY pinned DESC, created_at DESC, id DESC LIMIT ?',
        [category, limit]
      )
    : await db.all(
        'SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC, id DESC LIMIT ?',
        [limit]
      );
  res.json(rows);
}));

// Create announcement (admin)
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { title, body, category = 'General', pinned = false } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required.' });
  }
  const result = await db.run(
    'INSERT INTO announcements (title, body, category, pinned) VALUES (?, ?, ?, ?)',
    [String(title), String(body), CATEGORIES.includes(category) ? category : 'General', pinned ? 1 : 0]
  );
  res.status(201).json(await db.get('SELECT * FROM announcements WHERE id = ?', [result.lastInsertRowid]));
}));

// Update announcement (admin)
router.patch('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const a = await db.get('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
  if (!a) return res.status(404).json({ error: 'Announcement not found' });

  const fields = [];
  const values = [];
  for (const key of ['title', 'body', 'category', 'pinned']) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(
        key === 'pinned'
          ? (req.body[key] ? 1 : 0)
          : key === 'category'
            ? (CATEGORIES.includes(req.body[key]) ? req.body[key] : 'General')
            : req.body[key]
      );
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
  values.push(a.id);
  await db.run(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, values);
  res.json(await db.get('SELECT * FROM announcements WHERE id = ?', [a.id]));
}));

// Delete announcement (admin)
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const result = await db.run('DELETE FROM announcements WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Announcement not found' });
  res.json({ ok: true });
}));

export default router;
