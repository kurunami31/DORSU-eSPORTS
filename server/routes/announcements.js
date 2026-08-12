import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin, asyncHandler } from '../middleware.js';
import { requiredStr, optionalStr } from '../validate.js';

const router = Router();

const CATEGORIES = ['Tournament', 'General', 'Community', 'Patch'];

function validateAnnouncementInput(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.title !== undefined) {
    out.title = requiredStr(body.title, { name: 'Title', min: 2, max: 120 });
  }
  if (!partial || body.body !== undefined) {
    out.body = requiredStr(body.body, { name: 'Body', min: 1, max: 5000 });
  }
  if (!partial || body.category !== undefined) {
    const category = body.category ?? 'General';
    if (!CATEGORIES.includes(category)) throw Object.assign(new Error('Invalid category.'), { status: 400 });
    out.category = category;
  }
  if (!partial || body.pinned !== undefined) {
    out.pinned = body.pinned ? 1 : 0;
  }
  return out;
}

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
  const data = validateAnnouncementInput(req.body);
  const result = await db.run(
    'INSERT INTO announcements (title, body, category, pinned) VALUES (?, ?, ?, ?)',
    [data.title, data.body, data.category, data.pinned]
  );
  res.status(201).json(await db.get('SELECT * FROM announcements WHERE id = ?', [result.lastInsertRowid]));
}));

// Update announcement (admin)
router.patch('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const a = await db.get('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
  if (!a) return res.status(404).json({ error: 'Announcement not found' });

  const data = validateAnnouncementInput(req.body, { partial: true });
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(value);
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
