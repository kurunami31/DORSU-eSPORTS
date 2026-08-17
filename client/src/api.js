const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('dorsu_user_token') || '';
}

export function setToken(token) {
  if (token) localStorage.setItem('dorsu_user_token', token);
  else localStorage.removeItem('dorsu_user_token');
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const getStats = () => api('/stats');
export const getMaintenance = () => api('/maintenance');
export const getGames = () => api('/games');
export const getLeaderboard = ({ game, limit } = {}) => {
  const q = new URLSearchParams();
  if (game) q.set('game', game);
  if (limit) q.set('limit', String(limit));
  const s = q.toString();
  return api(`/leaderboard${s ? `?${s}` : ''}`);
};
export const getTournaments = (status, game) => {
  const q = new URLSearchParams();
  if (status) q.set('status', status);
  if (game) q.set('game', game);
  const s = q.toString();
  return api(`/tournaments${s ? `?${s}` : ''}`);
};
export const getTournament = (id) => api(`/tournaments/${id}`);
export const getBracket = (id) => api(`/tournaments/${id}/bracket`);
export const getRegistrations = (tournamentId) => api(`/tournaments/${tournamentId}/registrations`);
export const getAnnouncements = (limit) => api(`/announcements${limit ? `?limit=${limit}` : ''}`);

export const sendChat = (messages) =>
  api('/chat', { method: 'POST', body: JSON.stringify({ messages }) });

export const updateProfile = (data) =>
  api('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) });

export const createTournament = (data) =>
  api('/tournaments', { method: 'POST', body: JSON.stringify(data) });
export const updateTournament = (id, data) =>
  api(`/tournaments/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteTournament = (id) =>
  api(`/tournaments/${id}`, { method: 'DELETE' });
export const generateBrackets = (id) =>
  api(`/tournaments/${id}/generate-brackets`, { method: 'POST' });

export const registerTeam = (tournamentId, data) =>
  api(`/tournaments/${tournamentId}/registrations`, { method: 'POST', body: JSON.stringify(data) });
export const deleteRegistration = (id) =>
  api(`/registrations/${id}`, { method: 'DELETE' });

export const setWinner = (matchId, winnerId) =>
  api(`/matches/${matchId}/winner`, { method: 'POST', body: JSON.stringify({ winnerId }) });

// Super-admin only (see /admin panel)
export const getAdminStats = () => api('/admin/stats');
export const getAdminUsers = (q) => api(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
export const getAdminUser = (id) => api(`/admin/users/${id}`);
export const createAdminUser = (data) =>
  api('/admin/users', { method: 'POST', body: JSON.stringify(data) });
export const updateAdminUser = (id, data) =>
  api(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteAdminUser = (id) => api(`/admin/users/${id}`, { method: 'DELETE' });
export const setUserRole = (id, role, username) =>
  api(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role, username }) });
export const setMaintenance = (enabled, message) =>
  api('/admin/maintenance', { method: 'PUT', body: JSON.stringify({ enabled, message }) });

export const createAnnouncement = (data) =>
  api('/announcements', { method: 'POST', body: JSON.stringify(data) });
export const updateAnnouncement = (id, data) =>
  api(`/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteAnnouncement = (id) =>
  api(`/announcements/${id}`, { method: 'DELETE' });
