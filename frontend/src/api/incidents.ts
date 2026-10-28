import { apiClient } from './client';
import {
  Incident,
  IncidentNote,
  AuditVerifyResponse,
  ReplayResponse,
  AnalystFeedbackRequest,
  AnalystFeedbackResponse,
  SimilarIncidentResult,
} from '../types/incident';

export const incidentsApi = {
  listIncidents: async (params?: {
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<Incident[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    const qs = query.toString();
    return apiClient<Incident[]>(`/incidents${qs ? `?${qs}` : ''}`);
  },

  getIncident: async (incidentId: string): Promise<Incident> => {
    return apiClient<Incident>(`/incidents/${incidentId}`);
  },

  transitionIncident: async (
    incidentId: string,
    req: {
      new_status: string;
      reason?: string;
      notes?: string;
      assigned_to?: string;
    }
  ): Promise<Incident> => {
    return apiClient<Incident>(`/incidents/${incidentId}/transition`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  getIncidentNotes: async (incidentId: string): Promise<IncidentNote[]> => {
    return apiClient<IncidentNote[]>(`/incidents/${incidentId}/notes`);
  },

  addIncidentNote: async (incidentId: string, note_text: string): Promise<{ success: boolean; note_id: string; message: string }> => {
    return apiClient<{ success: boolean; note_id: string; message: string }>(`/incidents/${incidentId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note_text }),
    });
  },

  getIncidentReplay: async (incidentId: string): Promise<ReplayResponse> => {
    return apiClient<ReplayResponse>(`/incidents/${incidentId}/replay`);
  },

  getIncidentAudit: async (incidentId: string): Promise<AuditVerifyResponse> => {
    return apiClient<AuditVerifyResponse>(`/incidents/${incidentId}/audit`);
  },

  submitFeedback: async (
    incidentId: string,
    req: AnalystFeedbackRequest
  ): Promise<AnalystFeedbackResponse> => {
    return apiClient<AnalystFeedbackResponse>(`/incidents/${incidentId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  getSimilarIncidents: async (
    incidentId: string,
    top_k: number = 3
  ): Promise<SimilarIncidentResult[]> => {
    return apiClient<SimilarIncidentResult[]>(`/incidents/${incidentId}/similar?top_k=${top_k}`);
  },
};
