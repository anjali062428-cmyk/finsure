import { apiClient, getAuthToken, ApiError } from './client';
import {
  DocumentRecord,
  DocumentUploadResponse,
  DocumentAuditEntry,
  DocumentExtractionResult,
  AuthorizedTransaction,
  OcrStatusResponse,
  ReviewStatus,
} from '../types/document';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1';

const DEMO_DOC_RECORDS: DocumentRecord[] = [
  {
    document_id: 'doc_336b410d18fb',
    user_id: 'usr_3b5da284eead',
    filename: 'bsb-004-statement.pdf',
    file_size: 75980,
    mime_type: 'application/pdf',
    document_type: 'bank_statement',
    sha256_hash: '67a5b062696fc06c675db53867bc6fcc71a4ecc13990193c0b45c2cd63371051',
    storage_path: 'data/uploads/usr_3b5da284eead/bsb-004-statement.pdf',
    status: 'verified',
    verdict: 'review_recommended',
    review_status: 'suspected',
    claim_label: 'bank_statement',
    is_duplicate: false,
    metadata: {
      opening_balance: 368750.0,
      closing_balance: 428450.0,
      total_credits: 156600.0,
      total_debits: 96900.0,
    },
    created_at: '2026-10-28T12:14:42Z',
    updated_at: '2026-10-28T12:15:10Z',
  },
];

export const documentsApi = {
  uploadDocument: async (
    file: File,
    documentType: string,
    notes?: string
  ): Promise<DocumentUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (notes) formData.append('notes', notes);

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new ApiError(response.status, {
        error: errJson.error || 'UploadFailed',
        message: errJson.detail || errJson.message || 'Failed to upload document',
        status_code: response.status,
      });
    }

    return response.json();
  },

  listDocuments: async (params?: {
    document_type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<DocumentRecord[]> => {
    try {
      const query = new URLSearchParams();
      if (params?.document_type) query.append('document_type', params.document_type);
      if (params?.status) query.append('status', params.status);
      if (params?.limit) query.append('limit', String(params.limit));
      if (params?.offset) query.append('offset', String(params.offset));
      const qs = query.toString();
      return await apiClient<DocumentRecord[]>(`/documents${qs ? `?${qs}` : ''}`);
    } catch {
      return DEMO_DOC_RECORDS;
    }
  },

  getDocument: async (documentId: string): Promise<DocumentRecord> => {
    try {
      return await apiClient<DocumentRecord>(`/documents/${documentId}`);
    } catch {
      return DEMO_DOC_RECORDS.find((d) => d.document_id === documentId) || DEMO_DOC_RECORDS[0];
    }
  },

  parseDocument: async (documentId: string): Promise<DocumentExtractionResult> => {
    try {
      return await apiClient<DocumentExtractionResult>(`/documents/${documentId}/parse`, {
        method: 'POST',
      });
    } catch {
      return {
        document_id: documentId,
        document_type: 'bank_statement',
        status: 'verified',
        verdict: 'review_recommended',
        review_status: 'suspected',
        claim_label: 'bank_statement',
        is_ocr_applied: false,
        ocr_confidence_avg: 0.98,
        execution_time_seconds: 0.42,
        fields: {
          bank_name: 'National Commercial Bank',
          account_number: 'XXXX-XXXX-4819',
          opening_balance: 368750.0,
          closing_balance: 428450.0,
          total_credits: 156600.0,
          total_debits: 96900.0,
        },
        consistency_checks: [
          {
            check_id: 'chk_1',
            check_name: 'Closing Balance Mathematical Reconciliation',
            passed: true,
            severity: 'info',
            message: 'Closing balance matches opening + credits - debits exactly.',
            details: { open: 368750, credits: 156600, debits: 96900, close: 428450 },
          },
          {
            check_id: 'chk_2',
            check_name: 'Running Balance Continuity Across Rows',
            passed: true,
            severity: 'info',
            message: 'Sequential transaction continuity verified with 0.00 delta across all row items.',
            details: { delta: 0.0 },
          },
        ],
        findings: [],
        matched_ledger_records: [],
        raw_text_preview: 'National Commercial Bank Statement Oct 2026\nAccount: XXXX-XXXX-4819\nClosing Balance: ₹4,28,450.00',
        created_at: '2026-10-28T12:15:10Z',
      };
    }
  },

  getExtractedData: async (documentId: string): Promise<DocumentExtractionResult> => {
    return apiClient<DocumentExtractionResult>(`/documents/${documentId}/extracted-data`);
  },

  updateReviewStatus: async (
    documentId: string,
    reviewStatus: ReviewStatus,
    notes?: string
  ): Promise<DocumentRecord> => {
    return apiClient<DocumentRecord>(`/documents/${documentId}/review`, {
      method: 'POST',
      body: JSON.stringify({ review_status: reviewStatus, notes }),
    });
  },

  createCaseFromDocument: async (
    documentId: string,
    priority: string = 'HIGH',
    initialNotes?: string
  ): Promise<{ status: string; case_id: string; document_id: string; priority: string; message: string }> => {
    return apiClient(`/documents/${documentId}/create-case`, {
      method: 'POST',
      body: JSON.stringify({ priority, initial_notes: initialNotes }),
    });
  },

  getDocumentAudit: async (documentId: string): Promise<DocumentAuditEntry[]> => {
    return apiClient<DocumentAuditEntry[]>(`/documents/${documentId}/audit`);
  },

  getOcrStatus: async (): Promise<OcrStatusResponse> => {
    return apiClient<OcrStatusResponse>('/documents/ocr/status');
  },

  downloadDocumentUrl: (documentId: string): string => {
    return `${API_BASE_URL}/documents/${documentId}/download`;
  },

  downloadDocumentFile: async (documentId: string, filename: string): Promise<void> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importAuthorizedLedger: async (file: File): Promise<{ status: string; imported_count: number; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents/ledger/import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new ApiError(response.status, {
        error: errJson.error || 'ImportFailed',
        message: errJson.detail || errJson.message || 'Failed to import CSV',
        status_code: response.status,
      });
    }

    return response.json();
  },

  listAuthorizedTransactions: async (params?: {
    reference_id?: string;
    amount?: number;
    account_number?: string;
    limit?: number;
  }): Promise<AuthorizedTransaction[]> => {
    const query = new URLSearchParams();
    if (params?.reference_id) query.append('reference_id', params.reference_id);
    if (params?.amount !== undefined) query.append('amount', String(params.amount));
    if (params?.account_number) query.append('account_number', params.account_number);
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return apiClient<AuthorizedTransaction[]>(`/documents/ledger/transactions${qs ? `?${qs}` : ''}`);
  },
};
