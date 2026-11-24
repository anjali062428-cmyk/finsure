/**
 * FinSure Admin & System Governance API Client
 * Connects directly to backend health, model inspection, audit verification,
 * and RBAC protection endpoints.
 * Enforces Rule #1: No fabrication of metrics or persistence.
 */

import { apiClient } from './client';

export interface BackendHealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  models_loaded: boolean;
  model_version: string;
  threshold_version: string;
  redis_connected: boolean;
  backing_store: string;
}

export interface BackendModelsResponse {
  model_version: string;
  threshold_version: string;
  models: {
    xgboost: string;
    sequence_model: string;
    graph_sage: string;
    autoencoder: string;
    scam_classifier: string;
    meta_learner: string;
    [key: string]: string;
  };
  feature_count: number;
  decision_bands: Record<string, [number, number]>;
}

export interface AdminRbacStatusResponse {
  success: boolean;
  message: string;
}

export interface AdminUserRecord {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  email_verified: boolean;
  phone_verified: boolean;
  account_status: string;
  created_at: string;
  last_login_at?: string | null;
}

export interface AdminUserListResponse {
  users: AdminUserRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface PolicyRule {
  action: string;
  min_score: number;
  max_score: number;
  description: string;
}

export interface RiskBand {
  min_score: number;
  max_score: number;
  display_label: string;
  badge_color: string;
}

export interface PolicyConfigResponse {
  version: string;
  effective_date: string;
  description: string;
  frozen: boolean;
  thresholds: Record<string, PolicyRule>;
  bands: Record<string, RiskBand>;
  cost_parameters: {
    avg_fraud_loss_inr: number;
    friction_cost_inr: number;
  };
}

export interface PolicySimulationResponse {
  risk_score: number;
  action: string;
  risk_band: string;
  description: string;
  requires_challenge: boolean;
  allows_instant_execution: boolean;
}

export const adminApi = {
  /**
   * Fetches real-time server health and backing store status
   * GET /api/v1/health
   */
  getHealth: async (): Promise<BackendHealthResponse> => {
    return apiClient<BackendHealthResponse>('/health');
  },

  /**
   * Inspects all active model artifacts, versions, and decision bands
   * GET /api/v1/models
   */
  getModels: async (): Promise<BackendModelsResponse> => {
    return apiClient<BackendModelsResponse>('/models');
  },

  /**
   * Verifies Admin RBAC authorization with backend guard
   * GET /api/v1/auth/protected/admin-only
   */
  verifyAdminRbac: async (): Promise<AdminRbacStatusResponse> => {
    return apiClient<AdminRbacStatusResponse>('/auth/protected/admin-only');
  },

  /**
   * Lists registered platform users with filtering and pagination
   * GET /api/v1/users
   */
  listUsers: async (params?: {
    role?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<AdminUserListResponse> => {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return apiClient<AdminUserListResponse>(`/users${qs ? `?${qs}` : ''}`);
  },

  /**
   * Retrieves single user record
   * GET /api/v1/users/{userId}
   */
  getUser: async (userId: string): Promise<AdminUserRecord> => {
    return apiClient<AdminUserRecord>(`/users/${encodeURIComponent(userId)}`);
  },

  /**
   * Updates user status (active, suspended, locked)
   * PATCH /api/v1/users/{userId}/status
   */
  updateUserStatus: async (userId: string, status: string): Promise<AdminUserRecord> => {
    return apiClient<AdminUserRecord>(`/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Updates user role (customer, fraud_analyst, compliance_officer, admin)
   * PATCH /api/v1/users/{userId}/role
   */
  updateUserRole: async (userId: string, role: string): Promise<AdminUserRecord> => {
    return apiClient<AdminUserRecord>(`/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  /**
   * Fetches current authoritative policy thresholds and risk bands
   * GET /api/v1/policies
   */
  getPolicies: async (): Promise<PolicyConfigResponse> => {
    return apiClient<PolicyConfigResponse>('/policies');
  },

  /**
   * Simulates policy decision for an arbitrary risk score
   * POST /api/v1/policies/simulate
   */
  simulatePolicy: async (riskScore: number): Promise<PolicySimulationResponse> => {
    return apiClient<PolicySimulationResponse>('/policies/simulate', {
      method: 'POST',
      body: JSON.stringify({ risk_score: riskScore }),
    });
  },
};
