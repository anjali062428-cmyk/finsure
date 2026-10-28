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
};
