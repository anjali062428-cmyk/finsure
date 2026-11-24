/**
 * FinSure Document Verification Platform Types
 */

export type DocumentType = 'bank_statement' | 'invoice' | 'payment_receipt' | 'other';

export type DocumentStatus =
  | 'uploaded'
  | 'processing'
  | 'parsed'
  | 'analyzed'
  | 'flagged'
  | 'verified'
  | 'failed';

export type VerificationVerdict =
  | 'no_significant_anomalies'
  | 'review_recommended'
  | 'high_risk_indicators'
  | 'verification_incomplete';

export type ReviewStatus = 'suspected' | 'reviewed' | 'confirmed';

export interface DocumentRecord {
  document_id: string;
  user_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  document_type: DocumentType;
  sha256_hash: string;
  storage_path: string;
  status: DocumentStatus;
  verdict?: VerificationVerdict | null;
  review_status: ReviewStatus;
  claim_label: string;
  is_duplicate: boolean;
  duplicate_of?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DocumentUploadResponse {
  document_id: string;
  user_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  document_type: DocumentType;
  sha256_hash: string;
  status: DocumentStatus;
  claim_label: string;
  is_duplicate: boolean;
  duplicate_of?: string | null;
  created_at: string;
}

export interface DocumentAuditEntry {
  audit_id: string;
  document_id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface AuthorizedTransaction {
  record_id: string;
  reference_id: string;
  account_number?: string | null;
  payer_vpa?: string | null;
  payee_vpa?: string | null;
  amount: number;
  currency: string;
  transaction_date: string;
  is_synthetic: boolean;
  data_source: string;
  notes?: string | null;
  created_at: string;
}

export interface ConsistencyCheck {
  check_id: string;
  check_name: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'high_risk';
  message: string;
  details: Record<string, any>;
}

export interface DocumentFinding {
  finding_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence_ids: string[];
  human_review_note: string;
}

export interface TransactionRow {
  row_index: number;
  date: string;
  description: string;
  reference_id?: string | null;
  debit: number;
  credit: number;
  balance: number;
  source: string;
  review_required: boolean;
}

export interface InvoiceLineItem {
  item_index: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  source: string;
}

export interface DocumentExtractionResult {
  document_id: string;
  document_type: DocumentType;
  status: DocumentStatus;
  verdict: VerificationVerdict;
  review_status: ReviewStatus;
  claim_label: string;
  is_ocr_applied: boolean;
  ocr_confidence_avg?: number | null;
  execution_time_seconds: number;
  fields: Record<string, any>;
  consistency_checks: ConsistencyCheck[];
  findings: DocumentFinding[];
  matched_ledger_records: AuthorizedTransaction[];
  raw_text_preview: string;
  created_at: string;
}

export interface OcrStatusResponse {
  available: boolean;
  executable?: string | null;
  status: string;
  fallback_note?: string;
}
