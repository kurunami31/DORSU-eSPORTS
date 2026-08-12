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

/**
 * Read a picked image file and return a compact JPEG data URL.
 * - `maxDim`: longest edge after resize (default 256).
 * - `square`: when true, center-crop to a square first (profile avatars);
 *   when false the aspect ratio is preserved (team logos / group photos).
 * - `maxChars`: server-side payload cap — the encoder steps JPEG quality down
 *   until the data URL fits, so a valid image never gets rejected as "too big".
 *
 * Transparent pixels (e.g. team logos) are flattened onto the site's panel
 * color instead of JPEG's default black.
 */
export function fileToImage(file, { maxDim = 256, square = true, maxChars = 85_000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Image is too large — please pick one under 8 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        // The site's panel color — transparent logos flatten onto this instead
        // of JPEG's default black.
        const BG = '#0e1530';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Your browser could not process the image.'));
          return;
        }
        if (square) {
          canvas.width = maxDim;
          canvas.height = maxDim;
          ctx.fillStyle = BG;
          ctx.fillRect(0, 0, maxDim, maxDim);
          // Square center-crop, then scale down.
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, maxDim, maxDim);
        } else {
          // Preserve aspect: fit the longest edge into maxDim.
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          ctx.fillStyle = BG;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        // Step quality down until the payload fits the server-side cap.
        for (const q of [0.82, 0.7, 0.58, 0.45, 0.32]) {
          const url = canvas.toDataURL('image/jpeg', q);
          if (url.length <= maxChars) {
            resolve(url);
            return;
          }
        }
        reject(new Error('That image is too detailed to compress — please try a smaller one.'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
