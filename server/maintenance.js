// Maintenance-mode state.
// Priority: the MAINTENANCE_MODE / MAINTENANCE_MESSAGE env vars (useful on
// Vercel or before the panel is reachable) take precedence; otherwise the
// super admin can flip it live from the admin panel, which writes the
// 'maintenance' / 'maintenance_message' rows in the settings table.
import { db } from './db.js';

function parseFlag(v) {
  return ['1', 'true', 'on', 'yes'].includes(String(v || '').trim().toLowerCase());
}

export async function maintenanceEnabled() {
  if (process.env.MAINTENANCE_MODE !== undefined && process.env.MAINTENANCE_MODE !== '') {
    return parseFlag(process.env.MAINTENANCE_MODE);
  }
  try {
    const row = await db.get("SELECT value FROM settings WHERE key = 'maintenance'");
    return row ? parseFlag(row.value) : false;
  } catch {
    return false;
  }
}

export async function maintenanceMessage() {
  if (process.env.MAINTENANCE_MESSAGE) return process.env.MAINTENANCE_MESSAGE;
  try {
    const row = await db.get("SELECT value FROM settings WHERE key = 'maintenance_message'");
    return row && row.value ? row.value : null;
  } catch {
    return null;
  }
}
