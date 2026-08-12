export function formatDate(iso) {
  if (!iso) return 'TBA';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return 'TBA';
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const STATUS_META = {
  open: { label: 'Open', badge: 'badge-open' },
  locked: { label: 'Sealed', badge: 'badge-locked' },
  active: { label: 'Live', badge: 'badge-active' },
  finished: { label: 'Finished', badge: 'badge-finished' },
};

export function statusMeta(status) {
  return STATUS_META[status] || { label: status, badge: 'badge-finished' };
}

export function teamSizeLabel(teamSize) {
  return teamSize === 1 ? '1v1' : `${teamSize}v${teamSize}`;
}

// Game → icon + optional real logo art (images live in client/public/logos/)
export const GAMES = {
  'Mobile Legends: Bang Bang': { icon: 'gamepad', tint: 'blue', image: '/logos/ml-logo.webp' },
  'Call of Duty: Mobile': { icon: 'crosshair', tint: 'green', image: '/logos/codm-logo.png' },
  Valorant: { icon: 'crosshair', tint: 'red' },
  'Tekken 8': { icon: 'flame', tint: 'yellow' },
  'Dota 2': { icon: 'moon', tint: 'green' },
  'League of Legends': { icon: 'trophy', tint: 'gold' },
  'Call of Duty': { icon: 'crosshair', tint: 'red' },
  FIFA: { icon: 'medal', tint: 'green' },
};

export function gameGlyph(game) {
  return GAMES[game] || { icon: 'gamepad', tint: 'blue' };
}

export const FACEBOOK_URL = 'https://www.facebook.com/dorsuesportscommunity';
