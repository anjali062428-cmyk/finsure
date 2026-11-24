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
    const query = new URLSearchParams();
    if (params?.document_type) query.append('document_type', params.document_type);
    if (params?.status) query.append('status', params.status);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    const qs = query.toString();
    return apiClient<DocumentRecord[]>(`/documents${qs ? `?${qs}` : ''}`);
  },

  getDocument: async (documentId: string): Promise<DocumentRecord> => {
    return apiClient<DocumentRecord>(`/documents/${documentId}`);
  },

  parseDocument: async (documentId: string): Promise<DocumentExtractionResult> => {
    return apiClient<DocumentExtractionResult>(`/documents/${documentId}/parse`, {
      method: 'POST',
    });
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
