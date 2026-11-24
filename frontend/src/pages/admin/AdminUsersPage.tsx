import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Key,
  UserCheck,
  Lock,
  Search,
  RefreshCw,
  AlertCircle,
  UserX,
  CheckCircle,
  ChevronDown,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuth } from '../../context/AuthContext';
import { adminApi, AdminUserRecord } from '../../api/admin';

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Mutation tracking
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await adminApi.listUsers({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: searchTerm.trim() || undefined,
        limit: 100,
      });
      setUsers(resp.users);
      setTotal(resp.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query user records';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusToggle = async (targetUser: AdminUserRecord) => {
    if (targetUser.user_id === currentUser?.user_id) {
      setFeedback({ type: 'error', message: 'You cannot suspend or modify your own active account.' });
      return;
    }

    const nextStatus = targetUser.account_status === 'active' ? 'suspended' : 'active';
    setMutatingId(targetUser.user_id);
    setFeedback(null);
    try {
      const updated = await adminApi.updateUserStatus(targetUser.user_id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === updated.user_id ? { ...u, account_status: updated.account_status } : u))
      );
      setFeedback({
        type: 'success',
        message: `Account status for ${targetUser.email} updated to ${nextStatus.toUpperCase()}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setMutatingId(null);
    }
  };

  const handleRoleChange = async (targetUser: AdminUserRecord, newRole: string) => {
    if (targetUser.user_id === currentUser?.user_id) {
      setFeedback({ type: 'error', message: 'You cannot alter your own administrative role.' });
      return;
    }
    if (targetUser.role === newRole) return;

    setMutatingId(targetUser.user_id);
    setFeedback(null);
    try {
      const updated = await adminApi.updateUserRole(targetUser.user_id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === updated.user_id ? { ...u, role: updated.role } : u))
      );
      setFeedback({
        type: 'success',
        message: `RBAC role for ${targetUser.email} updated to ${newRole.toUpperCase()}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change user role';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setMutatingId(null);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'compliance_officer':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'fraud_analyst':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & Access Control Directory"
        description="Authoritative identity governance, RBAC role assignment, and account session controls."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users' },
        ]}
      />

      {/* Active Session & Authority Banner */}
      <div className="p-4 rounded-lg bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-accent/10 border border-accent/20 text-accent">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text">
              Authoritative User Management ({total} Registered Accounts)
            </h4>
            <p className="text-xs text-text-muted">
              Live identity repository with Argon2id password verification and cryptographic session management.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh Directory
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-risk-critical/10 border-risk-critical/20 text-risk-critical'
            }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-text-muted hover:text-text font-bold text-sm ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Directory Filter & Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-surface-muted border border-border text-text placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md bg-surface-muted border border-border text-text focus:outline-none focus:border-accent"
            >
              <option value="">All Roles</option>
              <option value="customer">Customer</option>
              <option value="fraud_analyst">Fraud Analyst</option>
              <option value="compliance_officer">Compliance Officer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md bg-surface-muted border border-border text-text focus:outline-none focus:border-accent"
            >
              <option value="">All Account Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>
      </Card>

      {/* User Directory Table */}
      <Card className="overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-12">
            <LoadingState message="Querying live user repository..." />
          </div>
        ) : error ? (
          <div className="p-8">
            <ErrorState
              title="Failed to Load Users"
              message={error}
              onRetry={fetchUsers}
            />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-text-muted mx-auto" />
            <h5 className="text-sm font-semibold text-text">No Accounts Matching Query</h5>
            <p className="text-xs text-text-muted">
              Try adjusting your search criteria or role filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50 text-text-muted uppercase text-[10px] tracking-wider font-mono">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">RBAC Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const isSelf = u.user_id === currentUser?.user_id;
                  const isMutating = mutatingId === u.user_id;

                  return (
                    <tr key={u.user_id} className="hover:bg-surface-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-text">{u.full_name || 'Unnamed User'}</div>
                        <div className="text-[11px] text-text-muted font-mono">{u.email}</div>
                        {u.phone && <div className="text-[10px] text-text-muted">{u.phone}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-text-muted">
                        {u.user_id}
                      </td>
                      <td className="py-3 px-4">
                        {isAdmin && !isSelf ? (
                          <div className="relative inline-block">
                            <select
                              value={u.role}
                              disabled={isMutating}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                              className={`appearance-none text-[11px] font-semibold font-mono uppercase px-2 py-1 pr-6 rounded border cursor-pointer focus:outline-none ${getRoleBadgeStyle(
                                u.role
                              )}`}
                            >
                              <option value="customer" className="bg-surface text-text">Customer</option>
                              <option value="fraud_analyst" className="bg-surface text-text">Fraud Analyst</option>
                              <option value="compliance_officer" className="bg-surface text-text">Compliance Officer</option>
                              <option value="admin" className="bg-surface text-text">Admin</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-current absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                          </div>
                        ) : (
                          <span
                            className={`inline-block text-[11px] font-semibold font-mono uppercase px-2 py-0.5 rounded border ${getRoleBadgeStyle(
                              u.role
                            )}`}
                          >
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={u.account_status} />
                      </td>
                      <td className="py-3 px-4 text-text-muted text-[11px] font-mono">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isSelf ? (
                          <span className="text-[10px] font-mono text-accent font-semibold px-2 py-1 bg-accent/5 rounded border border-accent/20">
                            Current Session
                          </span>
                        ) : isAdmin ? (
                          <Button
                            variant={u.account_status === 'active' ? 'outline' : 'primary'}
                            size="sm"
                            disabled={isMutating}
                            onClick={() => handleStatusToggle(u)}
                            leftIcon={
                              u.account_status === 'active' ? (
                                <UserX className="w-3 h-3 text-risk-critical" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )
                            }
                          >
                            {isMutating ? 'Saving...' : u.account_status === 'active' ? 'Suspend' : 'Activate'}
                          </Button>
                        ) : (
                          <span className="text-[10px] text-text-muted italic">Read Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Security Baseline & Cryptographic Standards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Authenticated Session Record */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-semibold text-text flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-accent" />
            <span>Active Operator Identity</span>
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between p-3 rounded bg-surface-muted border border-border">
              <span className="text-text-muted">User ID:</span>
              <span className="font-bold text-text">{currentUser?.user_id || 'USR-ADMIN-ROOT'}</span>
            </div>
            <div className="flex justify-between p-3 rounded bg-surface-muted border border-border">
              <span className="text-text-muted">Legal Name:</span>
              <span className="text-text font-medium">{currentUser?.full_name || 'System Administrator'}</span>
            </div>
            <div className="flex justify-between p-3 rounded bg-surface-muted border border-border">
              <span className="text-text-muted">Registered Email:</span>
              <span className="text-text">{currentUser?.email || 'admin@finsure.internal'}</span>
            </div>
            <div className="flex justify-between p-3 rounded bg-surface-muted border border-border items-center">
              <span className="text-text-muted">Assigned RBAC Role:</span>
              <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent font-bold uppercase">
                {currentUser?.role || 'admin'}
              </span>
            </div>
          </div>
        </Card>

        {/* Cryptographic Standards */}
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
                <ShieldAlert className="w-3.5 h-3.5 text-warning" />
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
