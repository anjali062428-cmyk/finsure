import { Priority, Decision } from './common';

export type CaseStatus = 'new' | 'under_investigation' | 'escalated' | 'confirmed_fraud' | 'dismissed' | 'closed';

export type EvidenceType =
  | 'transaction'
  | 'device'
  | 'location'
  | 'graph_link'
  | 'shap_reason'
  | 'autoencoder_anomaly'
  | 'user_profile'
  | 'external_file'
  | 'analyst_note'
  | 'customer_report';

export interface CaseEvidence {
  evidence_id: string;
  case_id: string;
  evidence_type: EvidenceType;
  source_ref: string;
  added_by: string;
  content_hash: string;
  metadata: Record<string, unknown>;
  withdrawn_at?: string;
  withdraw_reason?: string;
  created_at: string;
}

export interface CaseTransition {
  transition_id: string;
  case_id: string;
  from_status: CaseStatus;
  to_status: CaseStatus;
  actor_id: string;
  reason_code?: string;
  note?: string;
  approved_by?: string;
  created_at: string;
}

export interface CaseNote {
  note_id: string;
  case_id: string;
  author_id: string;
  author_role: string;
  note_text: string;
  created_at: string;
}

export interface InvestigationRun {
  run_id: string;
  case_id: string;
  plan: string[];
  tool_calls: Array<{ tool: string; args: Record<string, unknown>; status: string }>;
  findings: Record<string, unknown>;
  report_text: string;
  provider: string;
  model: string;
  prompt_hash: string;
  validator_passed: boolean;
  groundedness_score: number;
  unsupported_claims: string[];
  latency_ms: number;
  created_at: string;
}

export interface Case {
  case_id: string;
  incident_id?: string;
  alert_id?: string;
  transaction_id: string;
  user_id: string;
  status: CaseStatus;
  priority: Priority;
  risk_score: number;
  risk_band: string;
  decision: Decision;
  scam_type?: string;
  assigned_to?: string;
  sla_due_at?: string;
  customer_reported: boolean;
  opened_at: string;
  updated_at: string;
  closed_at?: string;
  closed_by?: string;
  disposition?: string;
  disposition_reason?: string;
  disposition_note?: string;
  created_by?: string;
  evidence_count?: number;
}

export interface CaseWorkspace {
  case: Case;
  evidence: CaseEvidence[];
  transitions: CaseTransition[];
  notes: CaseNote[];
  latest_investigation?: InvestigationRun;
}

export interface ClaimValidationResult {
  valid: boolean;
  groundedness_score: number;
  supported_claims: string[];
  unsupported_claims: string[];
  rejection_reasons: string[];
  cited_evidence_verified: string[];
}
