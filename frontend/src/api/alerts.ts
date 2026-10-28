import { apiClient } from './client';
import { AlertQueueItem } from '../types/alert';

export const alertsApi = {
  listAlerts: async (params?: {
    priority?: string;
    status?: string;
    assigned_to?: string;
    scam_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<AlertQueueItem[]> => {
    const query = new URLSearchParams();
    if (params?.priority) query.append('priority', params.priority);
    if (params?.status) query.append('status', params.status);
    if (params?.assigned_to) query.append('assigned_to', params.assigned_to);
    if (params?.scam_type) query.append('scam_type', params.scam_type);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    const qs = query.toString();
    return apiClient<AlertQueueItem[]>(`/alerts${qs ? `?${qs}` : ''}`);
  },

  assignAlert: async (incidentId: string, analystId: string): Promise<unknown> => {
    return apiClient(`/incidents/${incidentId}/transition`, {
      method: 'POST',
      body: JSON.stringify({
        new_status: 'under_investigation',
        assigned_to: analystId,
      }),
    });
  },
};
