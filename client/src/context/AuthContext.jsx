import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  registerUser as apiRegister,
  loginUser as apiLogin,
  getCurrentUser as apiGetMe,
  logoutUser as apiLogout,
} from '../services/authService';

/**
 * Token Storage Strategy Documentation:
 * For this hackathon prototype, authentication tokens (JWTs) are stored in browser localStorage.
 * 
 * Security trade-off consideration:
 * - localStorage allows rapid client-side integration and seamless API calls without backend cookie-session state.
 * - However, localStorage is accessible to any JavaScript running on the origin and is vulnerable to Cross-Site
 *   Scripting (XSS) attacks if malicious script injection occurs.
 * - In a production enterprise deployment, the recommended pattern is HttpOnly, Secure, SameSite cookies with CSRF
 *   tokens to eliminate client-side script token access.
 */
const TOKEN_KEY = 'resource_share_token';
const USER_KEY = 'resource_share_user';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Validate token on application mount or token change
   */
  const verifySession = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiGetMe(storedToken);
      if (data?.user) {
        setUser(data.user);
        setToken(storedToken);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
    } catch (err) {
      // If token expired, invalid, unauthorized (401), or suspended account (403), clean up session
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
      }
      // Note: If server is offline (e.g. status 503 or network failure), keep cached user to prevent jarring flash
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  /**
   * Authenticate user with email and password
   */
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const result = await apiLogin({ email, password });
      const { token: receivedToken, user: receivedUser } = result;

      localStorage.setItem(TOKEN_KEY, receivedToken);
      localStorage.setItem(USER_KEY, JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  /**
   * Register a new user
   */
  const register = async (name, email, password) => {
    setAuthError(null);
    try {
      const result = await apiRegister({ name, email, password });
      const { token: receivedToken, user: receivedUser } = result;

      localStorage.setItem(TOKEN_KEY, receivedToken);
      localStorage.setItem(USER_KEY, JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    }
  };

  /**
   * Log out user
   */
  const logout = async () => {
    const currentToken = token;
    // Clear client state immediately for responsive UX
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setAuthError(null);

    // Notify backend
    try {
      await apiLogout(currentToken);
    } catch {
      // Ignored: client-side token discard is already complete
    }
  };

  /**
   * Manually refresh current user data
   */
  const refreshUser = async () => {
    if (!token) return null;
    try {
      const data = await apiGetMe(token);
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
    } catch {
      return null;
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    authError,
    setAuthError,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to consume the AuthContext
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
