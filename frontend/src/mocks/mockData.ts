/**
 * FinSure Development Mock Data
 *
 * DISCLAIMER:
 * This data is synthetic mock data for frontend interface development and testing.
 * All transactions, VPAs, amounts, and user identifiers are purely synthetic.
 * Never used for live financial settlements or production evaluation.
 */

export const IS_MOCK_DATA = true;

export interface MockTransaction {
  id: string;
  timestamp: string;
  payerVpa: string;
  payeeVpa: string;
  amount: number;
  riskScore: number;
  probability: number;
  decision: 'allow' | 'challenge' | 'review' | 'block';
  status: 'settled' | 'pending_otp' | 'blocked' | 'in_review';
  scamType?: string;
  channel: string;
}

export const MOCK_TRANSACTIONS: MockTransaction[] = [
  {
    id: 'TXN-9021-A8F1',
    timestamp: '2026-09-29T01:45:12Z',
    payerVpa: 'priya.sharma@okaxis',
    payeeVpa: 'instant_lottery_rewards@ybl',
    amount: 49500.0,
    riskScore: 94.2,
    probability: 0.9421,
    decision: 'block',
    status: 'blocked',
    scamType: 'Lottery / Task Scam',
    channel: 'UPI_COLLECT',
  },
  {
    id: 'TXN-9021-B2C3',
    timestamp: '2026-09-29T01:42:05Z',
    payerVpa: 'vikram.mehta@okhdfcbank',
    payeeVpa: 'crypto_express_fast@paytm',
    amount: 18500.0,
    riskScore: 78.4,
    probability: 0.7842,
    decision: 'review',
    status: 'in_review',
    scamType: 'Impersonation Mule',
    channel: 'UPI_PAY',
  },
  {
    id: 'TXN-9021-D4E5',
    timestamp: '2026-09-29T01:38:40Z',
    payerVpa: 'ananya.iyer@oksbi',
    payeeVpa: 'electricity_bill_desk@icici',
    amount: 6200.0,
    riskScore: 52.1,
    probability: 0.5213,
    decision: 'challenge',
    status: 'pending_otp',
    scamType: 'High Velocity Deviation',
    channel: 'UPI_PAY',
  },
  {
    id: 'TXN-9021-F6G7',
    timestamp: '2026-09-29T01:30:19Z',
    payerVpa: 'rahul.deshmukh@okaxis',
    payeeVpa: 'supermarket_fresh@hdfcbank',
    amount: 1450.0,
    riskScore: 12.0,
    probability: 0.0124,
    decision: 'allow',
    status: 'settled',
    channel: 'UPI_QR',
  },
  {
    id: 'TXN-9021-H8J9',
    timestamp: '2026-09-29T01:15:02Z',
    payerVpa: 'deepa.nair@okicici',
    payeeVpa: 'swiggy_delivery@icici',
    amount: 480.0,
    riskScore: 5.5,
    probability: 0.0055,
    decision: 'allow',
    status: 'settled',
    channel: 'UPI_INTENT',
  },
];

export const MOCK_ALERTS = [
  {
    id: 'ALT-10492',
    ruleName: 'MULE_RING_HIGH_FANOUT',
    priority: 'critical' as const,
    riskScore: 94.2,
    assignedTo: null,
    createdAt: '2026-09-29T01:45:15Z',
    transactionId: 'TXN-9021-A8F1',
    description: 'Sudden high-velocity dispersion detected to newly activated payee VPA.',
  },
  {
    id: 'ALT-10491',
    ruleName: 'IMPERSONATION_SIM_SWAP',
    priority: 'high' as const,
    riskScore: 78.4,
    assignedTo: 'analyst@finsure.internal',
    createdAt: '2026-09-29T01:42:10Z',
    transactionId: 'TXN-9021-B2C3',
    description: 'Device fingerprint discrepancy combined with payee age < 24 hours.',
  },
  {
    id: 'ALT-10490',
    ruleName: 'UNUSUAL_TIME_AMOUNT_SPIKE',
    priority: 'medium' as const,
    riskScore: 52.1,
    assignedTo: null,
    createdAt: '2026-09-29T01:38:45Z',
    transactionId: 'TXN-9021-D4E5',
    description: 'Transaction exceeds 95th percentile historical baseline for account holder.',
  },
];

export const MOCK_SYSTEM_METRICS = {
  activeModels: 4,
  p95LatencyMs: 98.16,
  throughputRps: 412,
  cacheHitRatio: '94.2%',
  todayBlockedFraudAmount: '₹ 8,42,500',
  todayEvaluatedVolume: '14,920 transactions',
  currentAuditChainBlock: 18420,
};
