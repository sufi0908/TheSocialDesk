import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-xs text-slate-400 font-medium">Loading SocialDesk Workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect gracefully to correct dashboard
    if (role === 'superadmin') {
      return <Navigate to="/superadmin/dashboard" replace />;
    } else if (role === 'client' || role === 'client_user') {
      return <Navigate to="/client/dashboard" replace />;
    } else {
      return <Navigate to="/workspace/dashboard" replace />;
    }
  }

  return children;
};
