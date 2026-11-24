import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Download,
  FolderOpen,
  ArrowLeft,
  RefreshCw,
  Cpu,
  Loader2,
  Scale,
  Clock,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { documentsApi } from '../../api/documents';
import {
  DocumentRecord,
  DocumentExtractionResult,
  DocumentAuditEntry,
  ReviewStatus,
  TransactionRow,
  InvoiceLineItem,
} from '../../types/document';
import { useAuth } from '../../context/AuthContext';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [extractedData, setExtractedData] = useState<DocumentExtractionResult | null>(null);
  const [auditEntries, setAuditEntries] = useState<DocumentAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [activeTab, setActiveTab] = useState('extracted');

  // Case Escalation State
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [casePriority, setCasePriority] = useState('HIGH');
  const [caseNotes, setCaseNotes] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);
  const [caseSuccessMsg, setCaseSuccessMsg] = useState<string | null>(null);

  // Review Status State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<ReviewStatus>('reviewed');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);

  const fetchDocumentData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [doc, audits] = await Promise.all([
        documentsApi.getDocument(id),
        documentsApi.getDocumentAudit(id).catch(() => []),
      ]);
      setDocument(doc);
      setAuditEntries(audits);

      // Attempt to load extracted data if already analyzed or parsed
      if (doc.status === 'analyzed' || doc.status === 'parsed') {
        const data = await documentsApi.getExtractedData(id);
        setExtractedData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load document details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentData();
  }, [id]);

  const handleRunVerification = async () => {
    if (!id) return;
    setIsParsing(true);
    setError(null);
    try {
      const data = await documentsApi.parseDocument(id);
      setExtractedData(data);
      // Reload document metadata and audit log
      const [doc, audits] = await Promise.all([
        documentsApi.getDocument(id),
        documentsApi.getDocumentAudit(id),
      ]);
      setDocument(doc);
      setAuditEntries(audits);
    } catch (err: any) {
      setError(err.message || 'Verification execution failed.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCopyHash = () => {
    if (document?.sha256_hash) {
      navigator.clipboard.writeText(document.sha256_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleDownload = async () => {
    if (document) {
      try {
        await documentsApi.downloadDocumentFile(document.document_id, document.filename);
      } catch (err: any) {
        alert(`Download failed: ${err.message}`);
      }
    }
  };

  const handleEscalateToCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsEscalating(true);
    setError(null);
    try {
      const res = await documentsApi.createCaseFromDocument(id, casePriority, caseNotes);
      setCaseSuccessMsg(res.message);
      setIsCaseModalOpen(false);
      // Reload audit entries to show escalation event
      const audits = await documentsApi.getDocumentAudit(id);
      setAuditEntries(audits);
      setTimeout(() => {
        navigate(`/analyst/cases/${res.case_id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to escalate to Case Docket.');
    } finally {
      setIsEscalating(false);
    }
  };

  const handleUpdateReviewStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsUpdatingReview(true);
    try {
      const updated = await documentsApi.updateReviewStatus(id, selectedReviewStatus, reviewNotes);
      setDocument(updated);
      setIsReviewModalOpen(false);
      const audits = await documentsApi.getDocumentAudit(id);
      setAuditEntries(audits);
    } catch (err: any) {
      setError(err.message || 'Failed to update review status.');
    } finally {
      setIsUpdatingReview(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading forensic document details..." />;
  }

  if (error && !document) {
    return <ErrorState message={error} onRetry={fetchDocumentData} />;
  }

  if (!document) {
    return <ErrorState message="Document not found." onRetry={() => navigate(-1)} />;
  }

  const isCustomer = user?.role === 'customer';
  const basePath = isCustomer ? '/customer/documents' : '/analyst/documents';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          to={basePath}
          className="inline-flex items-center space-x-1.5 text-xs text-[#B7B7B7] hover:text-[#BFE8F5] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Document Hub</span>
        </Link>
      </div>

      {/* Success Notice if Case Created */}
      {caseSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center space-x-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{caseSuccessMsg} Redirecting to Case Docket...</span>
        </div>
      )}

      {/* Main Document Header Card */}
      <Card className="p-6 bg-[#080F17] border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                {document.document_id}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#2C3480]/30 text-[#BFE8F5] border border-[#BFE8F5]/30">
                {document.claim_label}
              </span>
              {document.is_duplicate && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Duplicate File (of {document.duplicate_of})
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
              <FileText className="w-6 h-6 text-[#BFE8F5]" />
              <span>{document.filename}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/50 pt-1">
              <span>Size: {(document.file_size / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span>Type: {document.document_type.replace('_', ' ').toUpperCase()}</span>
              <span>•</span>
              <span>MIME: {document.mime_type}</span>
              <span>•</span>
              <span>Uploaded: {new Date(document.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Action Deck */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={handleRunVerification}
              disabled={isParsing}
              className="flex items-center space-x-2 bg-[#BFE8F5] text-[#101827] hover:bg-white font-medium text-xs shadow-[0_0_15px_rgba(191,232,245,0.3)]"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying & Running Rules...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>{extractedData ? 'Re-Verify Document' : 'Run Verification'}</span>
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={handleDownload}
              className="flex items-center space-x-1.5 text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Original</span>
            </Button>

            {!isCustomer && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="flex items-center space-x-1.5 text-xs text-purple-400"
                >
                  <Scale className="w-4 h-4" />
                  <span>Review State</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setIsCaseModalOpen(true)}
                  className="flex items-center space-x-1.5 text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Escalate to Case Docket</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* SHA-256 Cryptographic Checksum Bar */}
        <div className="p-3 bg-[#05080D] border border-white/10 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-hidden">
            <span className="text-[11px] font-mono uppercase text-white/40 shrink-0">SHA-256 Checksum:</span>
            <span className="text-xs font-mono text-[#BFE8F5] truncate">{document.sha256_hash}</span>
          </div>
          <button
            onClick={handleCopyHash}
            className="p-1 hover:text-white transition-colors shrink-0 text-white/50"
            title="Copy Hash"
          >
            {copiedHash ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Verification Status & Verdict Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-[#05080D] border border-white/5 rounded-lg">
            <span className="text-[11px] text-white/40 uppercase font-mono">Verification Verdict</span>
            <div className="mt-1">
              {document.verdict === 'no_significant_anomalies' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Consistent (No Significant Anomalies)
                </span>
              )}
              {document.verdict === 'review_recommended' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Review Advised (Discrepancies Noted)
                </span>
              )}
              {document.verdict === 'high_risk_indicators' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  High Risk Discrepancies Detected
                </span>
              )}
              {document.verdict === 'verification_incomplete' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  Verification Incomplete
                </span>
              )}
              {!document.verdict && (
                <span className="text-xs text-white/50 font-mono">Pending Verification Run</span>
              )}
            </div>
          </div>

          <div className="p-3 bg-[#05080D] border border-white/5 rounded-lg">
            <span className="text-[11px] text-white/40 uppercase font-mono">Analyst Review State</span>
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize bg-white/10 text-white border border-white/20">
                {document.review_status}
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#05080D] border border-white/5 rounded-lg">
            <span className="text-[11px] text-white/40 uppercase font-mono">Extraction Method</span>
            <div className="mt-1 text-xs text-white/80 flex items-center space-x-1.5 font-mono">
              <Cpu className="w-3.5 h-3.5 text-[#BFE8F5]" />
              <span>
                {extractedData?.is_ocr_applied
                  ? `Bounded OCR (Avg Conf: ${(extractedData.ocr_confidence_avg || 75).toFixed(1)}%)`
                  : 'Digital PDF Text Stream'}
              </span>
            </div>
          </div>
        </div>

        {/* Explainability Governance Notice */}
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-amber-300/80 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            <strong>Human Oversight Invariant:</strong> Automated findings are assistive risk indicators for review. An anomaly does not constitute confirmed fraud, documents are never certified as &quot;authentic&quot;, and payment receipts represent unverified claims until reconciled.
          </span>
        </div>
      </Card>

      {/* Forensic Tabs Workspace */}
      <Tabs
        tabs={[
          {
            id: 'extracted',
            label: 'Extracted Fields & Provenance',
          },
          {
            id: 'consistency',
            label: `Financial Consistency (${extractedData?.consistency_checks?.length || 0})`,
          },
          {
            id: 'findings',
            label: `Findings & Indicators (${extractedData?.findings?.length || 0})`,
          },
          {
            id: 'audit',
            label: `Audit Trail (${auditEntries.length})`,
          },
          {
            id: 'raw_text',
            label: 'Raw Extracted Text',
          },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Panels */}
      {activeTab === 'extracted' && (
        <div className="space-y-4">
                {!extractedData ? (
                  <Card className="p-8 text-center bg-[#080F17] border-white/10">
                    <p className="text-white/60 mb-3">
                      This document has not been parsed yet. Run verification to extract structured financial data.
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleRunVerification}
                      disabled={isParsing}
                      className="bg-[#BFE8F5] text-[#101827] hover:bg-white font-medium shadow-[0_0_15px_rgba(191,232,245,0.3)]"
                    >
                      {isParsing ? 'Verifying...' : 'Run Extraction & Verification'}
                    </Button>
                  </Card>
                ) : (
                  <>
                    {/* Bank Statement Data Rendering */}
                    {document.document_type === 'bank_statement' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <Card className="p-3 bg-[#080F17] border-white/10">
                            <span className="text-[11px] text-white/40 uppercase font-mono">Bank Name</span>
                            <p className="font-semibold text-white mt-0.5">{extractedData.fields.bank_name || 'N/A'}</p>
                          </Card>
                          <Card className="p-3 bg-[#080F17] border-white/10">
                            <span className="text-[11px] text-white/40 uppercase font-mono">Account Number</span>
                            <p className="font-mono text-white mt-0.5">{extractedData.fields.account_number || 'N/A'}</p>
                          </Card>
                          <Card className="p-3 bg-[#080F17] border-white/10">
                            <span className="text-[11px] text-white/40 uppercase font-mono">Opening Balance</span>
                            <p className="font-mono text-white mt-0.5">
                              {extractedData.fields.opening_balance !== null
                                ? `₹${Number(extractedData.fields.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : 'N/A'}
                            </p>
                          </Card>
                          <Card className="p-3 bg-[#080F17] border-white/10">
                            <span className="text-[11px] text-white/40 uppercase font-mono">Closing Balance</span>
                            <p className="font-mono text-white mt-0.5">
                              {extractedData.fields.closing_balance !== null
                                ? `₹${Number(extractedData.fields.closing_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : 'N/A'}
                            </p>
                          </Card>
                        </div>

                        {/* Statement Transactions Table */}
                        <Card className="p-4 bg-[#080F17] border-white/10 space-y-3">
                          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                            <span>Transaction Rows ({extractedData.fields.transactions?.length || 0})</span>
                          </h3>
                          <div className="overflow-x-auto max-h-[400px]">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#05080D] text-white/60 font-mono uppercase text-[10px]">
                                <tr>
                                  <th className="p-2.5">#</th>
                                  <th className="p-2.5">Date</th>
                                  <th className="p-2.5">Description</th>
                                  <th className="p-2.5 text-right">Debit (₹)</th>
                                  <th className="p-2.5 text-right">Credit (₹)</th>
                                  <th className="p-2.5 text-right">Balance (₹)</th>
                                  <th className="p-2.5">Source</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 font-mono">
                                {extractedData.fields.transactions?.map((tx: TransactionRow) => (
                                  <tr key={tx.row_index} className="hover:bg-white/5 transition-colors">
                                    <td className="p-2.5 text-white/40">{tx.row_index}</td>
                                    <td className="p-2.5 text-white/80">{tx.date}</td>
                                    <td className="p-2.5 text-white font-sans max-w-[240px] truncate">{tx.description}</td>
                                    <td className="p-2.5 text-right text-rose-400">
                                      {tx.debit > 0 ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="p-2.5 text-right text-emerald-400">
                                      {tx.credit > 0 ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="p-2.5 text-right text-white font-semibold">
                                      {tx.balance > 0 ? tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="p-2.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                        tx.source === 'ocr' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                                      }`}>
                                        {tx.source}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Invoice Data Rendering */}
                    {document.document_type === 'invoice' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <Card className="p-3 bg-[#080F17] border-white/10">
                            <span className="text-[11px] text-white/40 uppercase font-mono">Invoice Number</span>
                            <p className="font-mono text-white mt-0.5 font-bold">{extractedData.fields.invoice_number || 'N/A'}</p>
                          </Card>
                          <Card className="p-3 bg-[#080F17] border-white/10">
                            <span className="text-[11px] text-white/40 uppercase font-mono">Vendor / GSTIN</span>
                            <p className="text-white mt-0.5 truncate">{extractedData.fields.vendor_name || 'N/A'}</p>
                            <p className="font-mono text-xs text-[#BFE8F5]">{extractedData.fields.vendor_tax_id || ''}</p>
                          </Card>
                          <Card className="p-3 bg-[#080F17] border-white/10">
                            <span className="text-[11px] text-white/40 uppercase font-mono">Invoice Date</span>
                            <p className="font-mono text-white mt-0.5">{extractedData.fields.invoice_date || 'N/A'}</p>
                          </Card>
                          <Card className="p-3 bg-[#080F17] border-white/10">
                            <span className="text-[11px] text-white/40 uppercase font-mono">Stated Grand Total</span>
                            <p className="font-mono text-lg font-bold text-white mt-0.5">
                              {extractedData.fields.grand_total !== null
                                ? `₹${Number(extractedData.fields.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : 'N/A'}
                            </p>
                          </Card>
                        </div>

                        {/* Invoice Line Items */}
                        <Card className="p-4 bg-[#080F17] border-white/10 space-y-3">
                          <h3 className="text-sm font-semibold text-white">Line Items</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#05080D] text-white/60 font-mono uppercase text-[10px]">
                                <tr>
                                  <th className="p-2.5">Item</th>
                                  <th className="p-2.5">Description</th>
                                  <th className="p-2.5 text-right">Quantity</th>
                                  <th className="p-2.5 text-right">Unit Price (₹)</th>
                                  <th className="p-2.5 text-right">Total (₹)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 font-mono">
                                {extractedData.fields.line_items?.map((item: InvoiceLineItem) => (
                                  <tr key={item.item_index}>
                                    <td className="p-2.5 text-white/40">{item.item_index}</td>
                                    <td className="p-2.5 text-white font-sans">{item.description}</td>
                                    <td className="p-2.5 text-right text-white/80">{item.quantity}</td>
                                    <td className="p-2.5 text-right text-white/80">{item.unit_price.toFixed(2)}</td>
                                    <td className="p-2.5 text-right font-semibold text-white">{item.total_amount.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="pt-3 border-t border-white/10 flex justify-end space-x-6 text-xs font-mono">
                            <span>Subtotal: ₹{extractedData.fields.subtotal?.toFixed(2) || '0.00'}</span>
                            <span>Tax: ₹{extractedData.fields.tax_amount?.toFixed(2) || '0.00'}</span>
                            <span className="text-[#BFE8F5] font-bold">
                              Calculated Total: ₹{extractedData.fields.calculated_total?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Payment Receipt Data Rendering */}
                    {document.document_type === 'payment_receipt' && (
                      <Card className="p-6 bg-[#080F17] border-white/10 space-y-4 max-w-2xl">
                        <div className="border-b border-white/10 pb-3 flex justify-between items-center">
                          <h3 className="font-semibold text-white">Payment Receipt Claim Record</h3>
                          <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            payment_claim
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                          <div>
                            <span className="text-white/40 uppercase block mb-1">Reference / UTR ID</span>
                            <span className="text-sm font-bold text-[#BFE8F5]">{extractedData.fields.reference_id || 'Not Extracted'}</span>
                          </div>
                          <div>
                            <span className="text-white/40 uppercase block mb-1">Claimed Amount</span>
                            <span className="text-lg font-bold text-white">
                              {extractedData.fields.claimed_amount !== null
                                ? `₹${Number(extractedData.fields.claimed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : 'Not Extracted'}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/40 uppercase block mb-1">Transaction Date</span>
                            <span className="text-white/80">{extractedData.fields.transaction_date || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-white/40 uppercase block mb-1">Payment Mode</span>
                            <span className="text-white/80">{extractedData.fields.payment_mode || 'UPI'}</span>
                          </div>
                        </div>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tab 2: Consistency */}
            {activeTab === 'consistency' && (
              <div className="space-y-4">
                {!extractedData?.consistency_checks?.length ? (
                  <Card className="p-8 text-center bg-[#080F17] border-white/10">
                    <p className="text-white/60">No financial consistency checks have been run yet.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {extractedData.consistency_checks.map((chk) => (
                      <Card
                        key={chk.check_id}
                        className={`p-4 bg-[#080F17] border ${
                          chk.passed
                            ? 'border-emerald-500/30'
                            : chk.severity === 'high_risk'
                            ? 'border-rose-500/40'
                            : 'border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            {chk.passed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertCircle
                                className={`w-5 h-5 shrink-0 ${
                                  chk.severity === 'high_risk' ? 'text-rose-400' : 'text-amber-400'
                                }`}
                              />
                            )}
                            <h4 className="font-semibold text-sm text-white">{chk.check_name}</h4>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                              chk.passed
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : chk.severity === 'high_risk'
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {chk.passed ? 'PASSED' : chk.severity.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-white/80 mt-2">{chk.message}</p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Findings */}
            {activeTab === 'findings' && (
              <div className="space-y-4">
                {!extractedData?.findings?.length ? (
                  <Card className="p-8 text-center bg-[#080F17] border-white/10">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-white font-medium">No Suspicious Anomalies Flagged</p>
                    <p className="text-xs text-white/50 mt-1">
                      Mathematical reconciliations, balances, and records conformed to baseline rules.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {extractedData.findings.map((fnd) => (
                      <Card
                        key={fnd.finding_id}
                        className="p-4 bg-[#080F17] border-white/10 space-y-2 border-l-4 border-l-amber-400"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-white text-sm">{fnd.title}</h4>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-white/70">
                            Severity: {fnd.severity}
                          </span>
                        </div>
                        <p className="text-xs text-white/80">{fnd.description}</p>
                        <div className="p-2 bg-white/5 rounded text-[11px] text-white/60">
                          <strong>Analyst Advisory:</strong> {fnd.human_review_note}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Audit */}
            {activeTab === 'audit' && (
              <Card className="p-4 bg-[#080F17] border-white/10 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#BFE8F5]" />
                  <span>Immutable Document Lifecycle Events</span>
                </h3>
                <div className="divide-y divide-white/5">
                  {auditEntries.map((a) => (
                    <div key={a.audit_id} className="py-2.5 flex items-start justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[#BFE8F5] font-semibold">{a.action}</span>
                          <span className="text-white/40">by {a.user_id}</span>
                        </div>
                        <pre className="text-[11px] font-mono text-white/60 mt-1 bg-black/30 p-2 rounded max-w-xl overflow-x-auto">
                          {JSON.stringify(a.details, null, 2)}
                        </pre>
                      </div>
                      <span className="text-white/40 font-mono text-[11px]">
                        {new Date(a.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Tab 5: Raw Text */}
            {activeTab === 'raw_text' && (
              <Card className="p-4 bg-[#080F17] border-white/10 space-y-2">
                <div className="flex justify-between items-center text-xs text-white/50">
                  <span>Extracted Text Stream Preview</span>
                  <span>Execution Time: {extractedData?.execution_time_seconds || 0}s</span>
                </div>
                <pre className="p-4 bg-[#05080D] border border-white/5 rounded-lg text-xs font-mono text-white/70 overflow-x-auto max-h-[450px]">
                  {extractedData?.raw_text_preview || 'No raw text extracted.'}
                </pre>
              </Card>
            )}

      {/* Escalate to Case Modal */}
      <Modal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        title="Escalate Document to Case Docket"
      >
        <form onSubmit={handleEscalateToCase} className="space-y-4">
          <p className="text-xs text-white/70">
            Escalating this document creates a formal Case Docket. Document metadata, SHA-256 hash, and findings will be automatically bound into the immutable evidence binder.
          </p>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Case Priority
            </label>
            <Select
              options={[
                { label: 'CRITICAL (Immediate Action)', value: 'CRITICAL' },
                { label: 'HIGH (Standard Escalation)', value: 'HIGH' },
                { label: 'MEDIUM (Review Queue)', value: 'MEDIUM' },
                { label: 'LOW (Informational)', value: 'LOW' },
              ]}
              value={casePriority}
              onChange={(e) => setCasePriority(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Investigator Notes / Escalation Rationale
            </label>
            <Input
              placeholder="e.g., Unreconciled balance discrepancy and missing ledger record"
              value={caseNotes}
              onChange={(e) => setCaseNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
            <Button variant="ghost" onClick={() => setIsCaseModalOpen(false)} disabled={isEscalating}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isEscalating}
              className="bg-rose-500 hover:bg-rose-600 text-white font-medium"
            >
              {isEscalating ? 'Creating Case...' : 'Create Case Docket'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Review Status Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Update Analyst Review State"
      >
        <form onSubmit={handleUpdateReviewStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Review Status
            </label>
            <Select
              options={[
                { label: 'Reviewed (Analyst Examination Complete)', value: 'reviewed' },
                { label: 'Confirmed (Human Adjudicated Finding)', value: 'confirmed' },
                { label: 'Suspected (Pending Examination)', value: 'suspected' },
              ]}
              value={selectedReviewStatus}
              onChange={(e) => setSelectedReviewStatus(e.target.value as ReviewStatus)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Review Notes
            </label>
            <Input
              placeholder="e.g., Cross-verified with physical tax invoice copy"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
            <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)} disabled={isUpdatingReview}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isUpdatingReview}>
              {isUpdatingReview ? 'Saving...' : 'Update Status'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
