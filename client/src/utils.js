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

export const GAMES = {
  'Mobile Legends: Bang Bang': { icon: '⚔️', tint: 'blue' },
  Valorant: { icon: '🎯', tint: 'red' },
  'Tekken 8': { icon: '👊', tint: 'yellow' },
  'Dota 2': { icon: '🌙', tint: 'green' },
  'League of Legends': { icon: '🏆', tint: 'gold' },
  'Call of Duty': { icon: '💥', tint: 'red' },
  'FIFA': { icon: '⚽', tint: 'green' },
};

export function gameGlyph(game) {
  return GAMES[game] || { icon: '🎮', tint: 'blue' };
}
