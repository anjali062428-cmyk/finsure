import { apiClient } from './client';

export interface HealthStatus {
  status: string;
  version: string;
  timestamp: string;
}

export interface ModelsHealthStatus {
  status: string;
  models: Record<string, { loaded: boolean; version?: string }>;
}

export const healthApi = {
  getHealth: async (): Promise<HealthStatus> => {
    return apiClient<HealthStatus>('/health');
  },

  getModelsHealth: async (): Promise<ModelsHealthStatus> => {
    return apiClient<ModelsHealthStatus>('/health/models');
  },
};
