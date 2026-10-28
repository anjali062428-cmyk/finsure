import { Priority, Decision } from './common';

export type IncidentStatus =
  | 'new'
  | 'under_investigation'
  | 'escalated'
  | 'confirmed_fraud'
  | 'dismissed'
  | 'closed';

export interface Incident {
  incident_id: string;
  transaction_id: string;
  user_id: string;
  risk_score: number;
  risk_probability: number;
  risk_band: Priority | string;
  decision: Decision | string;
  status: IncidentStatus;
  priority: Priority;
  scam_type?: string;
  assigned_to?: string;
  sla_due_at?: string;
  scoring_snapshot?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  model_version?: string;
  threshold_version?: string;
}

export interface IncidentEvent {
  event_id: string;
  incident_id: string;
  event_type: string;
  actor_id: string;
  actor_role?: string;
  timestamp: string;
  event_payload: Record<string, unknown>;
  previous_hash: string;
  record_hash: string;
}

export interface AuditVerifyResponse {
  incident_id: string;
  chain_valid: boolean;
  message: string;
  verified_event_count: number;
  events: IncidentEvent[];
}

export interface IncidentNote {
  note_id: string;
  incident_id: string;
  author_id: string;
  author_role: string;
  note_text: string;
  created_at: string;
}

export interface AnalystFeedbackRequest {
  verdict: 'confirmed_fraud' | 'dismissed' | 'escalated' | 'false_positive' | 'scam_type_correction';
  notes: string;
  scam_type_corrected?: string;
  evidence_references?: string[];
}

export interface AnalystFeedbackResponse {
  success: boolean;
  feedback_id: string;
  verdict: string;
  message: string;
}

export interface SimilarIncidentResult {
  similar_incident_id: string;
  transaction_id: string;
  similarity_score: number;
  risk_score: number;
  scam_type?: string;
  status: string;
  matching_features: string[];
  attribution_disclaimer?: string;
}

export interface ReplayTimelineEvent {
  event_type: string;
  timestamp: string;
  source: string;
  actor: string;
  details: Record<string, unknown>;
  risk_attribution?: string;
  is_synthesized?: boolean;
}

export interface ReplayResponse {
  incident_id: string;
  transaction_id: string;
  timeline: ReplayTimelineEvent[];
  event_count: number;
  generated_at?: string;
}
