import { apiClient } from './client';

export const reportsApi = {
  downloadCustomerReport: async (incidentId: string): Promise<Blob> => {
    return apiClient<Blob>(`/incidents/${incidentId}/report/customer`);
  },

  downloadAnalystReport: async (incidentId: string): Promise<Blob> => {
    return apiClient<Blob>(`/incidents/${incidentId}/report/analyst`);
  },

  verifyReport: async (
    incidentId: string,
    candidateHash: string,
    reportType: 'customer' | 'analyst' = 'analyst'
  ): Promise<{
    incident_id: string;
    report_type: string;
    verified: boolean;
    message: string;
  }> => {
    return apiClient(`/incidents/${incidentId}/report/verify`, {
      method: 'POST',
      body: JSON.stringify({
        candidate_hash: candidateHash,
        report_type: reportType,
      }),
    });
  },
};
