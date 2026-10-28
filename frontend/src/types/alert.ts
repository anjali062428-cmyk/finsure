import { Priority } from './common';

export interface AlertQueueItem {
  incident_id: string;
  transaction_id: string;
  user_id: string;
  priority: Priority;
  risk_score: number;
  status: 'new' | 'under_investigation' | 'escalated' | 'confirmed_fraud' | 'dismissed' | 'closed';
  scam_type?: string;
  created_at: string;
  sla_due_at?: string;
  assigned_to?: string;
}
