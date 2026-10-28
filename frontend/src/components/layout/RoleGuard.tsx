import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types/common';
import { Button } from '../ui/Button';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  redirectTo?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  redirectTo,
}) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = allowedRoles.includes(user.role);

  if (!hasAccess) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // Role-based auto-redirect target
    let fallbackPath = '/customer';
    if (user.role === 'admin') fallbackPath = '/admin';
    else if (user.role === 'fraud_analyst' || user.role === 'compliance_officer') fallbackPath = '/analyst';

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-risk-critical/20 rounded-lg max-w-lg mx-auto my-12">
        <div className="w-12 h-12 mb-3 rounded-full bg-risk-critical/10 flex items-center justify-center text-risk-critical">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-text mb-1">Access Restricted</h3>
        <p className="text-sm text-text-muted mb-4">
          Your role (<span className="font-mono font-semibold text-text">{user.role}</span>) does not have authorization to view this resource.
        </p>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            Go Back
          </Button>
          <Button variant="primary" size="sm" onClick={() => window.location.href = fallbackPath}>
            Go to Your Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
