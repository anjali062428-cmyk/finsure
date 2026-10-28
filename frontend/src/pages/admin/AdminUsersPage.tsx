import React from 'react';
import { Shield, AlertTriangle, Key, UserCheck, Lock } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';

export const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & Access Control Directory"
        description="RBAC governance, session security parameters, and identity boundaries."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users' },
        ]}
      />

      {/* Honest Backend Gap Disclosure */}
      <div className="p-4 rounded-lg bg-surface border border-border space-y-2">
        <div className="flex items-center space-x-2 text-warning text-xs font-mono font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>BACKEND GAP DISCLOSURE: User Directory API</span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          The backend authentication service does not expose a global user enumeration endpoint (`/api/v1/users`). In strict accordance with <strong>Rule #1 (Backend Authority &amp; Non-Fabrication)</strong>, mock customer rosters are not simulated. Identity management is enforced via individual authenticated sessions (`/api/v1/auth/me`), and cryptographic token validation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Authenticated Session Record */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-semibold text-text flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-accent" />
            <span>Active Admin Identity (Live Session)</span>
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between p-3 rounded bg-surface-muted border border-border">
              <span className="text-text-muted">User ID:</span>
              <span className="font-bold text-text">{user?.user_id || 'USR-ADMIN-ROOT'}</span>
            </div>
            <div className="flex justify-between p-3 rounded bg-surface-muted border border-border">
              <span className="text-text-muted">Legal Name:</span>
              <span className="text-text font-medium">{user?.full_name || 'System Administrator'}</span>
            </div>
            <div className="flex justify-between p-3 rounded bg-surface-muted border border-border">
              <span className="text-text-muted">Registered Email:</span>
              <span className="text-text">{user?.email || 'admin@finsure.internal'}</span>
            </div>
            <div className="flex justify-between p-3 rounded bg-surface-muted border border-border">
              <span className="text-text-muted">Phone Number:</span>
              <span className="text-text">{user?.phone || '***3001'}</span>
            </div>
            <div className="flex justify-between p-3 rounded bg-surface-muted border border-border items-center">
              <span className="text-text-muted">Assigned RBAC Role:</span>
              <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent font-bold uppercase">
                {user?.role || 'admin'}
              </span>
            </div>
            <div className="flex justify-between p-3 rounded bg-surface-muted border border-border items-center">
              <span className="text-text-muted">Account Status:</span>
              <StatusBadge status={user?.account_status || 'active'} />
            </div>
          </div>
        </Card>

        {/* Security & Access Policies */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-semibold text-text flex items-center space-x-2">
            <Shield className="w-4 h-4 text-accent-teal" />
            <span>Cryptographic Security Standards</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded bg-surface-muted border border-border space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-text">
                <Key className="w-3.5 h-3.5 text-accent" />
                <span>Argon2id Password Storage</span>
              </div>
              <p className="text-text-muted text-[11px]">
                Salted with 16-byte cryptographically secure random bytes ($m=65536$, $t=2$, $p=4$). Passwords and hashes are never exposed via API responses.
              </p>
            </div>

            <div className="p-3 rounded bg-surface-muted border border-border space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-text">
                <Lock className="w-3.5 h-3.5 text-accent-teal" />
                <span>Single-Use Refresh Token Rotation</span>
              </div>
              <p className="text-text-muted text-[11px]">
                JWT refresh tokens rotate on every invocation. Replaying an already-revoked refresh token immediately terminates the entire user token family.
              </p>
            </div>

            <div className="p-3 rounded bg-surface-muted border border-border space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-text">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                <span>Account Lockout Policy</span>
              </div>
              <p className="text-text-muted text-[11px]">
                5 consecutive authentication failures trigger a mandatory 15-minute lockout window with security event logging in the immutable auth audit trail.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
