import { apiClient } from './client';
import {
  Case,
  CaseEvidence,
  CaseWorkspace,
  CaseNote,
  InvestigationRun,
  ClaimValidationResult,
  CaseStatus,
  EvidenceType,
} from '../types/case';

export const casesApi = {
  listCases: async (params?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<Case[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.assigned_to) query.append('assigned_to', params.assigned_to);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    const qs = query.toString();
    return apiClient<Case[]>(`/cases${qs ? `?${qs}` : ''}`);
  },

  getCaseWorkspace: async (caseId: string): Promise<CaseWorkspace> => {
    return apiClient<CaseWorkspace>(`/cases/${caseId}`);
  },

  createCase: async (payload: {
    incident_id?: string;
    transaction_id?: string;
    customer_reported?: boolean;
    user_id?: string;
    risk_score?: number;
  }): Promise<Case> => {
    return apiClient<Case>('/cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  transitionCase: async (
    caseId: string,
    req: {
      to_status: CaseStatus;
      reason_code?: string;
      note?: string;
      approved_by?: string;
    }
  ): Promise<Case> => {
    return apiClient<Case>(`/cases/${caseId}/transition`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  getEvidence: async (caseId: string, includeWithdrawn = false): Promise<CaseEvidence[]> => {
    return apiClient<CaseEvidence[]>(`/cases/${caseId}/evidence?include_withdrawn=${includeWithdrawn}`);
  },

  addEvidence: async (
    caseId: string,
    req: { evidence_type: EvidenceType; source_ref: string; metadata: Record<string, unknown> }
  ): Promise<CaseEvidence> => {
    return apiClient<CaseEvidence>(`/cases/${caseId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  withdrawEvidence: async (
    caseId: string,
    evidenceId: string,
    withdraw_reason: string
  ): Promise<CaseEvidence> => {
    return apiClient<CaseEvidence>(`/cases/${caseId}/evidence/${evidenceId}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ withdraw_reason }),
    });
  },

  getNotes: async (caseId: string): Promise<CaseNote[]> => {
    return apiClient<CaseNote[]>(`/cases/${caseId}/notes`);
  },

  addNote: async (caseId: string, note_text: string): Promise<CaseNote> => {
    return apiClient<CaseNote>(`/cases/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note_text }),
    });
  },

  runInvestigator: async (caseId: string, provider = 'template'): Promise<InvestigationRun> => {
    return apiClient<InvestigationRun>(`/cases/${caseId}/investigate`, {
      method: 'POST',
      body: JSON.stringify({ provider }),
    });
  },

  validateClaims: async (
    caseId: string,
    claim_text: string,
    evidence_ids: string[] = []
  ): Promise<ClaimValidationResult> => {
    return apiClient<ClaimValidationResult>(`/cases/${caseId}/claim-validation`, {
      method: 'POST',
      body: JSON.stringify({ claim_text, evidence_ids }),
    });
  },

  getSimilarCases: async (caseId: string, topK = 3): Promise<{ case_id: string; similar_cases: unknown[]; attribution_disclaimer: string }> => {
    return apiClient<{ case_id: string; similar_cases: unknown[]; attribution_disclaimer: string }>(
      `/cases/${caseId}/similar?top_k=${topK}`
    );
  },

  getCaseTimeline: async (caseId: string): Promise<{ case_id: string; timeline: unknown[] }> => {
    return apiClient<{ case_id: string; timeline: unknown[] }>(`/cases/${caseId}/timeline`);
  },

  verifyAuditTrail: async (caseId: string): Promise<{ verified: boolean; events_verified: number; error?: string }> => {
    return apiClient<{ verified: boolean; events_verified: number; error?: string }>(`/cases/${caseId}/audit/verify`);
  },

  downloadEvidencePack: async (caseId: string): Promise<Blob> => {
    return apiClient<Blob>(`/cases/${caseId}/evidence-pack`);
  },
};
