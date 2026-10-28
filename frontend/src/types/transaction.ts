export interface CustomerSafetyHighlight {
  title: string;
  description: string;
}

export interface CustomerExplanation {
  language: string;
  status: string;
  header: string;
  message: string;
  instruction: string;
  safety_highlights: CustomerSafetyHighlight[];
}

export interface TransactionScoreRequest {
  transaction_id?: string;
  timestamp?: string;
  user_id: string;
  payee_id: string;
  amount: number;
  device_id: string;
  channel: 'upi' | 'card' | 'bank_transfer';
  city?: string;
  latitude?: number;
  longitude?: number;
  ip_address?: string;
  note?: string;
  language?: 'en' | 'hi';
}

export interface CanonicalTransactionScoreResponse {
  transaction_id: string;
  risk_score: number; // 0 - 100
  risk_probability: number; // 0.0 - 1.0
  risk_band: 'low' | 'medium' | 'high' | 'critical';
  decision: 'approve' | 'step_up' | 'cooling_period' | 'block';
  reason_codes: string[];
  customer_explanation: CustomerExplanation;
  analyst_explanation?: Record<string, unknown>;
  model_version: string;
  threshold_version: string;
  scored_at: string;
  audit_record_id?: string;
  latency_ms?: number;
}

// Session transaction representation combining request, score response, and lifecycle state
export interface TransactionRecord {
  id: string;
  timestamp: string;
  userId: string;
  payeeId: string;
  payeeName?: string;
  amount: number;
  channel: 'upi' | 'card' | 'bank_transfer';
  city?: string;
  note?: string;
  riskScore: number;
  riskProbability: number;
  riskBand: 'low' | 'medium' | 'high' | 'critical';
  decision: 'approve' | 'step_up' | 'cooling_period' | 'block';
  status: 'completed' | 'flagged' | 'blocked' | 'step_up_pending' | 'cooling_period';
  customerExplanation: CustomerExplanation;
  reasonCodes: string[];
  latencyMs?: number;
  auditRecordId?: string;
  stepUpVerified?: boolean;
  stepUpToken?: string;
  disputed?: boolean;
  disputeCaseId?: string;
}

export interface ChallengeVerifyRequest {
  challenge_id: string;
  otp: string;
}

export interface CustomerFeedbackRequest {
  feedback: 'this_was_me' | 'not_me';
  note?: string;
}
