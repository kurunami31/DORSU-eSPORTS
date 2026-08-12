import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const res = await api('/auth/me');
      setUser(res.user);
    } catch (err) {
      // Only an invalid/expired session (401) clears the token. Transient
      // failures (429 rate limit, network) keep the session for next time.
      if (err.status === 401) {
        setToken('');
        setUser(null);
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signup = useCallback(async (data) => {
    const res = await api('/auth/signup', { method: 'POST', body: JSON.stringify(data) });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const login = useCallback(async (data) => {
    const res = await api('/auth/login', { method: 'POST', body: JSON.stringify(data) });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  // Super admin sign-in (username + password → role: admin).
  const loginAdmin = useCallback(async (data) => {
    const res = await api('/auth/admin-login', { method: 'POST', body: JSON.stringify(data) });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* token may already be dead — clear locally either way */
    }
    setToken('');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, signup, login, loginAdmin, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
