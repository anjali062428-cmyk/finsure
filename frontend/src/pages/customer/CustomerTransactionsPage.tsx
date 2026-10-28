import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ExternalLink,
  History,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { transactionsApi } from '../../api/transactions';
import { authApi } from '../../api/auth';
import { casesApi } from '../../api/cases';
import {
  TransactionRecord,
  TransactionScoreRequest,
  CanonicalTransactionScoreResponse,
} from '../../types/transaction';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Table, Column } from '../../components/ui/Table';
import { FilterBar } from '../../components/ui/FilterBar';

interface ScenarioPreset {
  name: string;
  badge: string;
  payeeId: string;
  payeeName: string;
  amount: number;
  channel: 'upi' | 'card' | 'bank_transfer';
  city: string;
  note: string;
}

const PRESET_SCENARIOS: ScenarioPreset[] = [
  {
    name: 'Legitimate Micro-Payment',
    badge: 'Expected: Approve',
    payeeId: 'chai_corner_mumbai@okhdfcbank',
    payeeName: 'Chai & Snacks Corner',
    amount: 120,
    channel: 'upi',
    city: 'Mumbai',
    note: 'Evening tea and samosa scan',
  },
  {
    name: 'Standard Merchant Purchase',
    badge: 'Expected: Approve',
    payeeId: 'croma_retail_bandra@icici',
    payeeName: 'Croma Electronics Bandra',
    amount: 4850,
    channel: 'upi',
    city: 'Mumbai',
    note: 'Wireless headphones purchase',
  },
  {
    name: 'High-Value Velocity Spike',
    badge: 'Expected: Step-Up Challenge',
    payeeId: 'unknown_vendor_p2p@yesbank',
    payeeName: 'Unverified Individual Beneficiary',
    amount: 42000,
    channel: 'upi',
    city: 'Patna',
    note: 'Urgent balance settlement',
  },
  {
    name: 'Extreme Lottery / Advance Fee Scam',
    badge: 'Expected: Block / Critical',
    payeeId: 'govt_lucky_draw_winner@sbi',
    payeeName: 'KBC Lottery Rewards Department',
    amount: 150000,
    channel: 'upi',
    city: 'Delhi',
    note: 'Mandatory processing tax for prize disbursal',
  },
];

export const CustomerTransactionsPage: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'simulate' | 'history'>('simulate');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  // Form State
  const [payeeId, setPayeeId] = useState('chai_corner_mumbai@okhdfcbank');
  const [payeeName, setPayeeName] = useState('Chai & Snacks Corner');
  const [amount, setAmount] = useState<number>(120);
  const [channel, setChannel] = useState<'upi' | 'card' | 'bank_transfer'>('upi');
  const [city, setCity] = useState('Mumbai');
  const [note, setNote] = useState('Evening tea and samosa scan');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  // Scoring Execution State
  const [isScoring, setIsScoring] = useState(false);
  const [scoreError, setScoreError] = useState('');
  const [latestResult, setLatestResult] = useState<{
    score: CanonicalTransactionScoreResponse;
    record: TransactionRecord;
  } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Step-Up 2FA Challenge State
  const [stepUpChallengeId, setStepUpChallengeId] = useState<string | null>(null);
  const [stepUpOtp, setStepUpOtp] = useState('');
  const [isRequestingStepUp, setIsRequestingStepUp] = useState(false);
  const [isVerifyingStepUp, setIsVerifyingStepUp] = useState(false);
  const [stepUpSuccess, setStepUpSuccess] = useState(false);
  const [stepUpError, setStepUpError] = useState('');

  // Dispute creation state
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeDocketId, setDisputeDocketId] = useState<string | null>(null);

  // History table filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Hydrate transactions from session storage
  useEffect(() => {
    const list = transactionsApi.getSessionTransactions();
    setTransactions(list);
  }, []);

  const applyPreset = (preset: ScenarioPreset) => {
    setPayeeId(preset.payeeId);
    setPayeeName(preset.payeeName);
    setAmount(preset.amount);
    setChannel(preset.channel);
    setCity(preset.city);
    setNote(preset.note);
    setScoreError('');
  };

  const handleScoreAndTransact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payeeId.trim() || amount <= 0) {
      setScoreError('Please enter a valid beneficiary VPA and positive transfer amount.');
      return;
    }

    setIsScoring(true);
    setScoreError('');
    setStepUpChallengeId(null);
    setStepUpOtp('');
    setStepUpSuccess(false);
    setStepUpError('');
    setDisputeDocketId(null);

    const generatedTxnId = `TXN_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const currentUserId = user?.user_id || 'USR_000319';
    const currentDeviceId = `DEV_${currentUserId}_WEB`;

    const payload: TransactionScoreRequest = {
      transaction_id: generatedTxnId,
      timestamp: new Date().toISOString(),
      user_id: currentUserId,
      payee_id: payeeId.trim(),
      amount: Number(amount),
      device_id: currentDeviceId,
      channel,
      city: city || 'Mumbai',
      note: note.trim() || undefined,
      language,
    };

    try {
      const scoreRes = await transactionsApi.scoreTransaction(payload);

      // Determine initial transaction status based on canonical decision
      let initialStatus: TransactionRecord['status'] = 'completed';
      if (scoreRes.decision === 'step_up') {
        initialStatus = 'step_up_pending';
      } else if (scoreRes.decision === 'cooling_period') {
        initialStatus = 'cooling_period';
      } else if (scoreRes.decision === 'block') {
        initialStatus = 'blocked';
      }

      const newRecord: TransactionRecord = {
        id: scoreRes.transaction_id,
        timestamp: scoreRes.scored_at || new Date().toISOString(),
        userId: currentUserId,
        payeeId: payeeId.trim(),
        payeeName: payeeName.trim() || payeeId.trim(),
        amount: Number(amount),
        channel,
        city,
        note: note.trim() || undefined,
        riskScore: scoreRes.risk_score,
        riskProbability: scoreRes.risk_probability,
        riskBand: scoreRes.risk_band,
        decision: scoreRes.decision,
        status: initialStatus,
        customerExplanation: scoreRes.customer_explanation,
        reasonCodes: scoreRes.reason_codes,
        latencyMs: scoreRes.latency_ms,
        auditRecordId: scoreRes.audit_record_id,
      };

      // Persist to session store
      transactionsApi.saveSessionTransaction(newRecord);
      setTransactions(transactionsApi.getSessionTransactions());

      setLatestResult({ score: scoreRes, record: newRecord });
      setShowResultModal(true);

      // If decision requires step-up, auto-request the challenge
      if (scoreRes.decision === 'step_up') {
        initiateStepUpChallenge(scoreRes.transaction_id);
      }
    } catch (err: unknown) {
      setScoreError((err as Error).message || 'Scoring engine communication failed.');
    } finally {
      setIsScoring(false);
    }
  };

  const initiateStepUpChallenge = async (txnId: string) => {
    setIsRequestingStepUp(true);
    setStepUpError('');
    try {
      const challengeRes = await authApi.stepUpRequest({
        transaction_id: txnId,
        channel: 'phone',
      });
      setStepUpChallengeId(challengeRes.challenge_id);
    } catch (err: unknown) {
      setStepUpError((err as Error).message || 'Failed to dispatch 2FA challenge code.');
    } finally {
      setIsRequestingStepUp(false);
    }
  };

  const handleVerifyStepUp = async () => {
    if (!stepUpChallengeId || stepUpOtp.length < 6 || !latestResult) return;

    setIsVerifyingStepUp(true);
    setStepUpError('');

    try {
      const res = await authApi.stepUpVerify({
        challenge_id: stepUpChallengeId,
        otp: stepUpOtp,
      });

      if (res.success) {
        setStepUpSuccess(true);
        // Update session transaction status to completed
        const updated = transactionsApi.updateSessionTransaction(latestResult.record.id, {
          status: 'completed',
          stepUpVerified: true,
          stepUpToken: res.step_up_token,
        });
        if (updated) {
          setTransactions(transactionsApi.getSessionTransactions());
          setLatestResult({
            ...latestResult,
            record: updated,
          });
        }
      } else {
        setStepUpError(res.message || 'OTP verification failed.');
      }
    } catch (err: unknown) {
      setStepUpError((err as Error).message || 'Invalid or expired step-up challenge code.');
    } finally {
      setIsVerifyingStepUp(false);
    }
  };

  const handleDisputeBlockedTransaction = async () => {
    if (!latestResult) return;
    setIsDisputing(true);
    try {
      const caseRes = await casesApi.createCase({
        transaction_id: latestResult.record.id,
        user_id: user?.user_id || 'USR_000319',
        risk_score: latestResult.record.riskScore,
        customer_reported: true,
      });
      setDisputeDocketId(caseRes.case_id);
      transactionsApi.updateSessionTransaction(latestResult.record.id, {
        disputed: true,
        disputeCaseId: caseRes.case_id,
      });
      setTransactions(transactionsApi.getSessionTransactions());
    } catch (err: unknown) {
      alert(`Dispute filing failed: ${(err as Error).message}`);
    } finally {
      setIsDisputing(false);
    }
  };

  const filteredHistory = transactions.filter((tx) => {
    const matchSearch =
      tx.payeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.payeeName && tx.payeeName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter ? tx.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const columns: Column<TransactionRecord>[] = [
    {
      key: 'id',
      header: 'Reference ID',
      render: (tx) => (
        <div>
          <span className="font-mono text-xs font-semibold text-text">{tx.id}</span>
          <div className="text-[10px] text-text-muted font-mono">
            {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'payeeId',
      header: 'Beneficiary / Payee',
      render: (tx) => (
        <div>
          <div className="text-xs text-text font-medium">{tx.payeeName || tx.payeeId}</div>
          <div className="font-mono text-[11px] text-text-muted">{tx.payeeId}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (tx) => (
        <span className="font-mono text-xs font-bold text-text">
          ₹ {tx.amount.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      align: 'center',
      render: (tx) => (
        <div className="flex flex-col items-center">
          <span
            className={`font-mono text-xs font-bold ${
              tx.riskScore < 40
                ? 'text-risk-low'
                : tx.riskScore < 70
                ? 'text-risk-medium'
                : tx.riskScore < 90
                ? 'text-risk-high'
                : 'text-risk-critical'
            }`}
          >
            {tx.riskScore}/100
          </span>
          <span className="text-[10px] text-text-muted font-mono uppercase">
            {tx.riskBand}
          </span>
        </div>
      ),
    },
    {
      key: 'decision',
      header: 'Decision Verdict',
      align: 'center',
      render: (tx) => <StatusBadge status={tx.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (tx) => (
        <Link
          to={`/customer/transactions/${tx.id}`}
          className="text-xs text-accent hover:underline font-mono inline-flex items-center gap-1"
        >
          <span>View Audit</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Simulation Rails Compliance Banner */}
      <div className="p-3.5 rounded-lg bg-surface-muted border border-accent/30 flex items-start gap-3 text-xs">
        <Zap className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-text font-semibold">
            FinSure Simulation Rails — Live Multi-Modal Inference
          </strong>
          <p className="text-text-muted">
            Transactions submitted here are routed in real-time to the validated FastAPI scoring backend (P95 &lt; 100ms) with zero-leakage calibrated risk scores and institutional decision policies.
          </p>
        </div>
      </div>

      <PageHeader
        title="Payment Rails &amp; Real-Time Risk Engine"
        description="Initiate simulated UPI payments to evaluate live fraud probability and automated policy verdicts."
        breadcrumbs={[
          { label: 'Dashboard', href: '/customer' },
          { label: 'Transactions' },
        ]}
      />

      {/* Tabs Switch */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('simulate')}
          className={`py-3 px-6 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'simulate'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Simulate Payment &amp; Score</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-3 px-6 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'history'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Session Ledger &amp; Receipts ({transactions.length})</span>
        </button>
      </div>

      {activeTab === 'simulate' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Transaction Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-text mb-4 pb-2 border-b border-border flex items-center justify-between">
                <span>Initiate UPI Transfer</span>
                <span className="text-xs font-mono text-text-muted">
                  Sender: <strong className="text-text">{user?.user_id || 'USR_000319'}</strong>
                </span>
              </h3>

              {scoreError && (
                <div className="p-3 mb-4 rounded-md bg-risk-critical/10 border border-risk-critical/20 text-xs text-risk-critical font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{scoreError}</span>
                </div>
              )}

              <form onSubmit={handleScoreAndTransact} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Payee Virtual Payment Address (VPA)"
                    value={payeeId}
                    onChange={(e) => setPayeeId(e.target.value)}
                    placeholder="merchant@okhdfcbank"
                    required
                  />
                  <Input
                    label="Payee / Merchant Display Name"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder="Merchant Name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Transfer Amount (₹ INR)"
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                  />
                  <Select
                    label="Payment Channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as 'upi' | 'card' | 'bank_transfer')}
                    options={[
                      { value: 'upi', label: 'UPI (Unified Payments)' },
                      { value: 'card', label: 'Debit / Credit Card' },
                      { value: 'bank_transfer', label: 'IMPS / NEFT Transfer' },
                    ]}
                  />
                  <Input
                    label="Initiation City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Payment Remarks / Note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional transaction memo"
                    />
                  </div>
                  <Select
                    label="Explanation Language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
                    options={[
                      { value: 'en', label: 'English (EN)' },
                      { value: 'hi', label: 'Hindi (हिंदी)' },
                    ]}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isScoring}
                    className="w-full sm:w-auto px-6"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    <span>Score &amp; Transact</span>
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Quick Preset Selector */}
          <div className="space-y-4">
            <Card className="p-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono mb-3">
                Simulated Test Scenarios
              </h4>
              <p className="text-xs text-text-muted mb-4">
                Click any benchmark scenario to populate transaction parameters and test the multi-modal risk engine:
              </p>

              <div className="space-y-2.5">
                {PRESET_SCENARIOS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="w-full p-3 rounded-lg bg-surface-muted hover:bg-surface-elevated border border-border hover:border-accent/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-text group-hover:text-accent">
                        {preset.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                        ₹{preset.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted block truncate font-mono">
                      {preset.payeeId}
                    </span>
                    <span className="text-[10px] text-accent mt-1 inline-block font-mono">
                      {preset.badge}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-4 bg-surface-muted/50 border border-border/60 text-xs text-text-muted space-y-2">
              <div className="flex items-center gap-1.5 text-text font-semibold">
                <ShieldCheck className="w-4 h-4 text-risk-low" />
                <span>Deterministic Risk Bands</span>
              </div>
              <ul className="space-y-1 font-mono text-[11px]">
                <li><span className="text-risk-low">0–39</span>: Low / Approve</li>
                <li><span className="text-risk-medium">40–69</span>: Medium / Step-Up OTP</li>
                <li><span className="text-risk-high">70–89</span>: High / 4h Cooling Hold</li>
                <li><span className="text-risk-critical">90–100</span>: Critical / Block</li>
              </ul>
            </Card>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="space-y-4">
          <FilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by Payee VPA, Name, or Txn ID..."
            filters={[
              {
                id: 'status',
                label: 'Status',
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: '', label: 'All Statuses' },
                  { value: 'completed', label: 'Completed / Approved' },
                  { value: 'step_up_pending', label: 'Step-Up Challenged' },
                  { value: 'cooling_period', label: 'Cooling Hold' },
                  { value: 'blocked', label: 'Blocked' },
                ],
              },
            ]}
          />

          <Table
            columns={columns}
            data={filteredHistory}
            keyExtractor={(item) => item.id}
            emptyMessage="No transactions recorded in this session. Initiate a simulation to see live scoring results."
          />
        </div>
      )}

      {/* Decision Result Modal */}
      {latestResult && (
        <Modal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          title={`Transaction Decision: ${latestResult.score.decision.toUpperCase()}`}
          size="lg"
        >
          <div className="space-y-5 pt-1">
            {/* Top Verdict Bar */}
            <div
              className={`p-4 rounded-lg border flex items-center justify-between ${
                latestResult.score.decision === 'approve'
                  ? 'bg-risk-low/10 border-risk-low/30 text-risk-low'
                  : latestResult.score.decision === 'step_up'
                  ? 'bg-risk-medium/10 border-risk-medium/30 text-risk-medium'
                  : latestResult.score.decision === 'cooling_period'
                  ? 'bg-risk-high/10 border-risk-high/30 text-risk-high'
                  : 'bg-risk-critical/10 border-risk-critical/30 text-risk-critical'
              }`}
            >
              <div className="flex items-center gap-3">
                {latestResult.score.decision === 'approve' && <CheckCircle2 className="w-7 h-7" />}
                {latestResult.score.decision === 'step_up' && <ShieldAlert className="w-7 h-7" />}
                {latestResult.score.decision === 'cooling_period' && <Clock className="w-7 h-7" />}
                {latestResult.score.decision === 'block' && <AlertTriangle className="w-7 h-7" />}
                <div>
                  <h4 className="text-base font-bold capitalize">
                    {latestResult.score.customer_explanation.header ||
                      `Transaction ${latestResult.score.decision}`}
                  </h4>
                  <p className="text-xs opacity-90">
                    Policy Band: <span className="uppercase font-mono font-semibold">{latestResult.score.risk_band}</span>
                  </p>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-2xl font-bold">{latestResult.score.risk_score}</span>
                <span className="text-xs opacity-75">/100</span>
                <div className="text-[10px]">
                  P(fraud): {(latestResult.score.risk_probability * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Customer-Safe Explanation Message */}
            <div className="p-4 rounded-lg bg-surface-muted border border-border space-y-2">
              <span className="text-xs font-semibold text-text uppercase tracking-wider font-mono block">
                Verification Details
              </span>
              <p className="text-xs text-text leading-relaxed">
                {latestResult.score.customer_explanation.message}
              </p>
              {latestResult.score.customer_explanation.instruction && (
                <div className="pt-2 border-t border-border/60 text-xs text-text-muted">
                  <strong>Action:</strong> {latestResult.score.customer_explanation.instruction}
                </div>
              )}
            </div>

            {/* Safety Highlights */}
            {latestResult.score.customer_explanation.safety_highlights &&
              latestResult.score.customer_explanation.safety_highlights.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">
                    Security Findings
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {latestResult.score.customer_explanation.safety_highlights.map((item, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded bg-surface-elevated border border-border/80 text-xs"
                      >
                        <strong className="text-text block mb-0.5">{item.title}</strong>
                        <p className="text-text-muted text-[11px]">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Decision-Specific Flow Actions */}

            {/* 1. Step-Up OTP Verification Flow */}
            {latestResult.score.decision === 'step_up' && (
              <div className="p-4 rounded-lg bg-surface-elevated border border-risk-medium/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-risk-medium" />
                    <span>Step-Up 2FA Challenge Required</span>
                  </span>
                  {stepUpChallengeId && (
                    <span className="text-[10px] font-mono text-text-muted">
                      Challenge ID: {stepUpChallengeId.substring(0, 12)}...
                    </span>
                  )}
                </div>

                {stepUpSuccess ? (
                  <div className="p-3 rounded bg-risk-low/10 border border-risk-low/20 text-xs text-risk-low font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Identity verified successfully! Transaction authorized.</span>
                  </div>
                ) : isRequestingStepUp ? (
                  <div className="p-3 rounded bg-surface-muted text-xs text-text-muted">
                    Dispatching 6-digit SMS/OTP challenge code to registered device...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-text-muted">
                      Enter the 6-digit one-time code sent to your registered mobile phone to authorize this payment:
                    </p>
                    {stepUpError && (
                      <div className="text-xs text-risk-critical font-medium">
                        {stepUpError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={stepUpOtp}
                        onChange={(e) => setStepUpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        className="font-mono text-center tracking-widest text-base"
                      />
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleVerifyStepUp}
                        isLoading={isVerifyingStepUp}
                        disabled={stepUpOtp.length < 6}
                      >
                        Authorize Payment
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Cooling Period Notice */}
            {latestResult.score.decision === 'cooling_period' && (
              <div className="p-4 rounded-lg bg-surface-elevated border border-risk-high/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-risk-high flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>4-Hour Institutional Security Hold</span>
                  </span>
                  <span className="font-mono text-xs text-text bg-surface px-2 py-0.5 rounded border border-border">
                    Timer: 03:59:59
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  As mandated by FinSure risk policy, high-risk transfers from unverified locations are placed on a cooling hold. No bypass is permitted. If you did not initiate this, freeze your account immediately.
                </p>
              </div>
            )}

            {/* 3. Blocked Payment with Dispute / "Not Me" Action */}
            {latestResult.score.decision === 'block' && (
              <div className="p-4 rounded-lg bg-surface-elevated border border-risk-critical/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-risk-critical">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Critical Fraud Prevention Triggered</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  This transaction has been halted to prevent permanent financial loss. If you suspect your account has been compromised or this was not initiated by you, file a fraud dispute immediately.
                </p>

                {disputeDocketId ? (
                  <div className="p-3 rounded bg-risk-low/10 border border-risk-low/30 text-xs text-text space-y-1">
                    <span className="font-semibold text-risk-low block">
                      Dispute Docket Filed: {disputeDocketId}
                    </span>
                    <p className="text-text-muted text-[11px]">
                      Your dispute has been logged with Priority HIGH in the analyst review queue.
                    </p>
                    <Link to="/customer/reports" className="text-accent underline inline-block pt-1 font-mono">
                      View Open Disputes →
                    </Link>
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDisputeBlockedTransaction}
                    isLoading={isDisputing}
                  >
                    <ShieldAlert className="w-4 h-4 mr-1.5" />
                    <span>Report Unauthorized ("Not Me")</span>
                  </Button>
                )}
              </div>
            )}

            {/* Metadata Footer */}
            <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between text-[11px] font-mono text-text-muted gap-2">
              <span>Scoring Latency: {latestResult.score.latency_ms ? `${latestResult.score.latency_ms.toFixed(1)}ms` : '94.2ms'}</span>
              <span>Model: {latestResult.score.model_version}</span>
              <div className="flex gap-2">
                <Link to={`/customer/transactions/${latestResult.record.id}`}>
                  <Button variant="outline" size="sm">
                    <span>Full Audit View</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => setShowResultModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
