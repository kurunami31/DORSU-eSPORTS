const API_BASE = '/api';

export function getAdminKey() {
  return sessionStorage.getItem('dorsu_admin_key') || '';
}

export function setAdminKey(key) {
  if (key) sessionStorage.setItem('dorsu_admin_key', key);
  else sessionStorage.removeItem('dorsu_admin_key');
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const key = getAdminKey();
  if (key) headers['x-admin-key'] = key;

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
export const getTournaments = (status) => api(`/tournaments${status ? `?status=${status}` : ''}`);
export const getTournament = (id) => api(`/tournaments/${id}`);
export const getBracket = (id) => api(`/tournaments/${id}/bracket`);
export const getRegistrations = (tournamentId) => api(`/tournaments/${tournamentId}/registrations`);
export const getAnnouncements = (limit) => api(`/announcements${limit ? `?limit=${limit}` : ''}`);

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

export const createAnnouncement = (data) =>
  api('/announcements', { method: 'POST', body: JSON.stringify(data) });
export const updateAnnouncement = (id, data) =>
  api(`/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteAnnouncement = (id) =>
  api(`/announcements/${id}`, { method: 'DELETE' });
