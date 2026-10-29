import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

/**
 * AdminRoute Guard
 * Strictly restricts access to users with role === 'admin'.
 * Unauthenticated users are redirected to /login with state preserved.
 * Authenticated non-admin users receive a secure 403 Forbidden alert with safe navigation.
 */
export default function AdminRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">
          Verifying administrative privileges...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied (403 Forbidden)</h2>
          <p className="text-sm text-slate-400 mb-6">
            Institutional Administrator privileges are required to access this portal. Your current account ({user?.email}) has role{' '}
            <code className="text-blue-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
              {user?.role}
            </code>
            .
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Return to Member Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

