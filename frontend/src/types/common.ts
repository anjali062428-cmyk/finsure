/**
 * FinSure Common & Shared Domain Types
 */

export type Role = 'customer' | 'fraud_analyst' | 'analyst' | 'compliance_officer' | 'admin';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type Decision = 'allow' | 'flag' | 'step_up' | 'block';

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: unknown;
  request_id?: string;
  status_code?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface MetricSummary {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  helperText?: string;
}
