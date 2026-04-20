import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fp_token');
    const savedUser = localStorage.getItem('fp_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      authAPI.me().then(res => {
        setUser(res.data);
        localStorage.setItem('fp_user', JSON.stringify(res.data));
      }).catch(() => {
        localStorage.removeItem('fp_token');
        localStorage.removeItem('fp_user');
        setUser(null);
      });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('fp_token', res.data.token);
    localStorage.setItem('fp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, password, name) => {
    const res = await authAPI.register({ email, password, name });
    localStorage.setItem('fp_token', res.data.token);
    localStorage.setItem('fp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('fp_token');
    localStorage.removeItem('fp_user');
    setUser(null);
  };

  const markTelegramJoined = async () => {
    await authAPI.telegramJoined();
    const updated = { ...user, telegram_joined: true };
    setUser(updated);
    localStorage.setItem('fp_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, markTelegramJoined }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
