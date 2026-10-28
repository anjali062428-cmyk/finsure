import { apiClient } from './client';
import {
  TransactionScoreRequest,
  CanonicalTransactionScoreResponse,
  TransactionRecord,
  CustomerFeedbackRequest,
} from '../types/transaction';

const SESSION_TXN_KEY = 'finsure_customer_session_transactions';

// Seed benchmark transactions for initial session state if none exist yet
const INITIAL_SEED_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'TXN-9021-A8F1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    userId: 'USR_000319',
    payeeId: 'supermarket_fresh@hdfcbank',
    payeeName: 'Fresh Supermarket & Daily Needs',
    amount: 1450,
    channel: 'upi',
    city: 'Mumbai',
    note: 'Weekly provisions grocery scan',
    riskScore: 8,
    riskProbability: 0.021,
    riskBand: 'low',
    decision: 'approve',
    status: 'completed',
    reasonCodes: ['RC_BEN_KNOWN', 'RC_GEO_MATCH'],
    customerExplanation: {
      language: 'en',
      status: 'safe',
      header: 'Payment Verified & Approved',
      message: 'This payment matches your regular spending pattern and was verified securely.',
      instruction: 'No further action required. Your funds have been transferred.',
      safety_highlights: [
        { title: 'Trusted Merchant', description: 'Beneficiary has consistent verified payment history.' },
        { title: 'Device Binding Match', description: 'Initiated from your recognized smartphone hardware.' },
      ],
    },
    latencyMs: 84.5,
  },
  {
    id: 'TXN-8802-C1D2',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    userId: 'USR_000319',
    payeeId: 'unknown_lottery_rewards@yesbank',
    payeeName: 'Global Lucky Draw Claim Office',
    amount: 49500,
    channel: 'upi',
    city: 'Patna',
    note: 'Urgent processing fee for prize release',
    riskScore: 92,
    riskProbability: 0.942,
    riskBand: 'critical',
    decision: 'block',
    status: 'blocked',
    reasonCodes: ['RC_AMOUNT_OUTFLOW_SPIKE', 'RC_NEW_BENEFICIARY_UNVERIFIED', 'RC_GEO_VELOCITY_ANOMALY'],
    customerExplanation: {
      language: 'en',
      status: 'blocked',
      header: 'Payment Blocked for Your Protection',
      message: 'FinSure detected high-risk scam indicators consistent with lottery advance fee fraud.',
      instruction: 'Do not transfer funds to this VPA. If you did not initiate this, submit an immediate dispute.',
      safety_highlights: [
        { title: 'Zero-Day Scam Anomaly', description: 'Payee VPA flagged for rapid unverified velocity.' },
        { title: 'Extreme Value Spike', description: 'Amount is 12x higher than your 30-day baseline average.' },
      ],
    },
    latencyMs: 96.2,
  },
];

export const transactionsApi = {
  /**
   * Calls real backend FastAPI scoring engine: POST /api/v1/transactions/score
   */
  scoreTransaction: async (
    payload: TransactionScoreRequest
  ): Promise<CanonicalTransactionScoreResponse> => {
    return apiClient<CanonicalTransactionScoreResponse>('/transactions/score', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Submit customer dispute / feedback on a transaction
   */
  submitFeedback: async (
    transactionId: string,
    req: CustomerFeedbackRequest
  ): Promise<{ status: string; message: string }> => {
    return apiClient<{ status: string; message: string }>(
      `/transactions/${transactionId}/feedback`,
      {
        method: 'POST',
        body: JSON.stringify(req),
      }
    );
  },

  // -------------------------------------------------------------
  // Session Transaction Store (Phase 9B Gap Mitigation)
  // Maintains real-time scored transactions across customer session
  // -------------------------------------------------------------

  getSessionTransactions: (): TransactionRecord[] => {
    try {
      const stored = sessionStorage.getItem(SESSION_TXN_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback if session storage is disabled
    }
    return INITIAL_SEED_TRANSACTIONS;
  },

  saveSessionTransaction: (txn: TransactionRecord): void => {
    try {
      const current = transactionsApi.getSessionTransactions();
      const updated = [txn, ...current.filter((t) => t.id !== txn.id)];
      sessionStorage.setItem(SESSION_TXN_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist session transaction', e);
    }
  },

  getSessionTransactionById: (id: string): TransactionRecord | undefined => {
    const all = transactionsApi.getSessionTransactions();
    return all.find((t) => t.id === id);
  },

  updateSessionTransaction: (
    id: string,
    updates: Partial<TransactionRecord>
  ): TransactionRecord | undefined => {
    try {
      const all = transactionsApi.getSessionTransactions();
      const idx = all.findIndex((t) => t.id === id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...updates };
        sessionStorage.setItem(SESSION_TXN_KEY, JSON.stringify(all));
        return all[idx];
      }
    } catch (e) {
      console.warn('Failed to update session transaction', e);
    }
    return undefined;
  },
};
