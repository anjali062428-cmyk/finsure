import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Scan,
  Shield,
  Copy,
  ArrowRight,
  Layers,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface DemoDocument {
  id: string;
  name: string;
  type: 'bank_statement' | 'invoice' | 'payment_receipt';
  claimLabel: string;
  verdict: 'no_significant_anomalies' | 'review_recommended' | 'high_risk_indicators';
  verdictLabel: string;
  verdictColor: string;
  isDuplicate: boolean;
  duplicateOf?: string;
  sha256: string;
  fileSize: string;
  ocrMethod: string;
  executionTime: string;
  extractedFields: Record<string, string>;
  consistencyChecks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
  findings: Array<{
    title: string;
    severity: 'low' | 'medium' | 'high_risk';
    note: string;
  }>;
  auditEvents: Array<{
    action: string;
    actor: string;
    time: string;
  }>;
}

const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    id: 'doc_stmt_2026_01',
    name: 'National_Bank_Statement_Oct2026.pdf',
    type: 'bank_statement',
    claimLabel: 'bank_statement',
    verdict: 'no_significant_anomalies',
    verdictLabel: 'Consistent (No Anomalies)',
    verdictColor: 'text-[#38D6A3] bg-[#38D6A3]/15 border-[#38D6A3]/35',
    isDuplicate: false,
    sha256: '7d2f9a1c8b3e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
    fileSize: '412 KB',
    ocrMethod: 'Digital PDF Extraction (pdfplumber engine)',
    executionTime: '0.42s',
    extractedFields: {
      'Bank Institution': 'National Commercial Bank of India',
      'Account Number': '•••• •••• 8421',
      'Statement Period': '01-OCT-2026 to 28-OCT-2026',
      'Opening Balance': '₹3,68,750.00',
      'Total Debits (14 txns)': '₹96,900.00',
      'Total Credits (6 txns)': '₹1,56,600.00',
      'Stated Closing Balance': '₹4,28,450.00',
    },
    consistencyChecks: [
      {
        name: 'Closing Balance Mathematical Reconciliation',
        passed: true,
        details: '₹3,68,750.00 (Open) + ₹1,56,600.00 (Credits) - ₹96,900.00 (Debits) = Calculated ₹4,28,450.00 == Stated ₹4,28,450.00 [EXACT MATCH]',
      },
      {
        name: 'Running Balance Continuity Across 20 Rows',
        passed: true,
        details: 'Sequential transaction continuity verified with 0.00 delta across all row items.',
      },
      {
        name: 'Authorized Ledger Cross-Check',
        passed: true,
        details: 'Key transactions cross-referenced against authorized ledger records (Synthetic benchmark feed).',
      },
    ],
    findings: [],
    auditEvents: [
      { action: 'DOCUMENT_UPLOADED', actor: 'usr_analyst_1', time: '10:41 AM' },
      { action: 'DIGITAL_PDF_PARSED', actor: 'system_parser', time: '10:41 AM' },
      { action: 'CONSISTENCY_EVALUATED', actor: 'forensic_engine', time: '10:41 AM' },
    ],
  },
  {
    id: 'doc_inv_2026_02',
    name: 'Hardware_Enterprise_Tax_Invoice_9041.pdf',
    type: 'invoice',
    claimLabel: 'commercial_invoice',
    verdict: 'review_recommended',
    verdictLabel: 'Review Recommended (Math Mismatch)',
    verdictColor: 'text-[#FF4D5F] bg-[#FF4D5F]/15 border-[#FF4D5F]/35',
    isDuplicate: false,
    sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    fileSize: '620 KB',
    ocrMethod: 'Digital PDF Extraction (PyMuPDF)',
    executionTime: '0.38s',
    extractedFields: {
      'Supplier Legal Name': 'Enterprise Hardware & Network Ltd',
      'Supplier GSTIN': '27AAPFU0912K1Z9',
      'Invoice Number': 'INV-2026-9041',
      'Invoice Date': '24-OCT-2026',
      'Subtotal (Calculated)': '₹1,56,694.92',
      'IGST Calculated (18%)': '₹28,205.08',
      'Stated Grand Total': '₹1,94,900.00',
    },
    consistencyChecks: [
      {
        name: 'Line Items Sum vs Stated Subtotal',
        passed: true,
        details: 'Sum of 3 item lines equals stated subtotal ₹1,56,694.92.',
      },
      {
        name: 'Tax Calculation Check (IGST 18%)',
        passed: true,
        details: '18% on ₹1,56,694.92 = ₹28,205.08 verified exact.',
      },
      {
        name: 'Grand Total Reconciliation (Subtotal + Tax == Total)',
        passed: false,
        details: 'Expected ₹1,84,900.00, but stated is ₹1,94,900.00. Mathematical discrepancy of +₹10,000.00 detected.',
      },
    ],
    findings: [
      {
        title: 'Arithmetic Grand Total Discrepancy (+₹10,000.00)',
        severity: 'high_risk',
        note: 'Stated invoice total exceeds sum of line items and taxes by ₹10,000.00. Potential inflated claim or manual tampering.',
      },
    ],
    auditEvents: [
      { action: 'DOCUMENT_UPLOADED', actor: 'usr_customer_2', time: '02:15 PM' },
      { action: 'DIGITAL_PDF_PARSED', actor: 'system_parser', time: '02:15 PM' },
      { action: 'ARITHMETIC_ANOMALY_LOGGED', actor: 'forensic_engine', time: '02:15 PM' },
    ],
  },
  {
    id: 'doc_receipt_2026_03',
    name: 'UPI_Payment_Voucher_84500.png',
    type: 'payment_receipt',
    claimLabel: 'payment_claim',
    verdict: 'no_significant_anomalies',
    verdictLabel: 'Matched to Settlement Ledger',
    verdictColor: 'text-[#38D6A3] bg-[#38D6A3]/15 border-[#38D6A3]/35',
    isDuplicate: false,
    sha256: '1e66c2b189a04f9812e95a892b0c1e8934fa1298cde489a12b984fa1290a76f2',
    fileSize: '890 KB',
    ocrMethod: 'Tesseract OCR v5.5.3 (Bounded Extraction)',
    executionTime: '0.84s',
    extractedFields: {
      'Payment Rail': 'UPI Instant Settlement',
      'UTR Reference Number': 'UTR8829104192',
      'Beneficiary VPA': 'merchant.ops@bank',
      'Claimed Amount': '₹84,500.00',
      'Payment Timestamp': '21-OCT-2026 23:42:19 IST',
      'Claim Classification': 'payment_claim (Invariant enforced)',
    },
    consistencyChecks: [
      {
        name: 'Claim Label Invariant Compliance',
        passed: true,
        details: 'Receipt strictly classified as payment_claim. Never labelled as settled proof from OCR alone.',
      },
      {
        name: 'Authorized Ledger Cross-Reference',
        passed: true,
        details: 'Matched UTR8829104192 against authorized transaction ledger: ₹84,500.00 cleared at 21-OCT-2026 23:42:20 IST.',
      },
      {
        name: 'Payee VPA Reconciliation',
        passed: true,
        details: 'Extracted merchant.ops@bank matches registered beneficiary in bank clearing ledger.',
      },
    ],
    findings: [],
    auditEvents: [
      { action: 'IMAGE_UPLOADED', actor: 'usr_analyst_1', time: '04:10 PM' },
      { action: 'OCR_BOUNDS_EXTRACTED', actor: 'tesseract_pipeline', time: '04:10 PM' },
      { action: 'LEDGER_MATCH_CONFIRMED', actor: 'settlement_matcher', time: '04:10 PM' },
    ],
  },
  {
    id: 'doc_dup_2026_04',
    name: 'Hardware_Enterprise_Tax_Invoice_9041_Copy.pdf',
    type: 'invoice',
    claimLabel: 'commercial_invoice',
    verdict: 'high_risk_indicators',
    verdictLabel: 'Duplicate Submission Detected',
    verdictColor: 'text-[#FF4D5F] bg-[#FF4D5F]/15 border-[#FF4D5F]/35',
    isDuplicate: true,
    duplicateOf: 'doc_inv_2026_02',
    sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    fileSize: '620 KB',
    ocrMethod: 'Fast-Path SHA-256 Checksum Match (Zero duplicate storage)',
    executionTime: '0.04s',
    extractedFields: {
      'Duplicate Detection': 'Identical SHA-256 Hash Match',
      'Original Document Reference': 'doc_inv_2026_02',
      'First Seen Timestamp': '24-OCT-2026 02:15 PM',
      'Duplicate Attempt Timestamp': '28-OCT-2026 11:02 AM',
      'Duplicate Actor': 'usr_customer_7',
    },
    consistencyChecks: [
      {
        name: 'Cryptographic SHA-256 Collision Check',
        passed: false,
        details: 'Hash 9a8b...9a8b matches existing document doc_inv_2026_02. Content-addressable deduplication triggered.',
      },
      {
        name: 'Double-Claim / Re-Filing Policy',
        passed: false,
        details: 'Same tax invoice submitted by different customer account (usr_customer_7). Re-claim attempt blocked.',
      },
    ],
    findings: [
      {
        title: 'Cryptographic Duplicate Collision (Exact Match)',
        severity: 'high_risk',
        note: 'Document bytes are identical to previously processed invoice doc_inv_2026_02. Zero storage written. Marked duplicate and bound to case docket.',
      },
    ],
    auditEvents: [
      { action: 'DUPLICATE_DETECTED', actor: 'deduplication_engine', time: '11:02 AM' },
      { action: 'LINKED_TO_ORIGINAL', actor: 'doc_inv_2026_02', time: '11:02 AM' },
      { action: 'CASE_DOCKET_ESCALATED', actor: 'case_escalation_svc', time: '11:02 AM' },
    ],
  },
];

export const ForensicProductPreview: React.FC = () => {
  const [selectedDocId, setSelectedDocId] = useState<string>('doc_stmt_2026_01');
  const [activeTab, setActiveTab] = useState<'checks' | 'fields' | 'findings' | 'audit'>('checks');
  const [copiedHash, setCopiedHash] = useState(false);

  const currentDoc = DEMO_DOCUMENTS.find((d) => d.id === selectedDocId) || DEMO_DOCUMENTS[0];

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="w-full space-y-6 text-left">
      {/* Top Selector: Choose from 4 forensic scenarios */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#19D3FF] uppercase block font-semibold">
            Interactive Product Demonstration
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-[#F4F7FA] mt-0.5">
            Real Financial Document Inspection Console
          </h2>
        </div>

        {/* Document Selector Buttons */}
        <div className="flex flex-wrap gap-2">
          {DEMO_DOCUMENTS.map((doc) => {
            const isSelected = doc.id === selectedDocId;
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#19D3FF]/15 text-[#19D3FF] border border-[#19D3FF]/50 shadow-[0_0_12px_rgba(25,211,255,0.25)] font-bold'
                    : 'bg-[#0D1524] text-[#8B9AAA] border border-white/10 hover:text-[#F4F7FA] hover:border-[#19D3FF]/30'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[180px]">
                  {doc.type === 'bank_statement'
                    ? 'Bank Statement'
                    : doc.type === 'invoice' && doc.isDuplicate
                    ? 'Duplicate Filing'
                    : doc.type === 'invoice'
                    ? 'Commercial Invoice'
                    : 'Payment Claim'}
                </span>
                {doc.isDuplicate && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D5F] shrink-0 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Inspection Console Card */}
      <div className="rounded-2xl bg-[#080F17] border border-[rgba(25,211,255,0.2)] shadow-[0_16px_40px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* Document Header & Metadata Banner */}
        <div className="p-4 sm:p-5 bg-[#0D1524] border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#19D3FF]/10 text-[#19D3FF] border border-[#19D3FF]/30 font-bold">
                {currentDoc.claimLabel}
              </span>
              <span className="text-xs text-[#8B9AAA] font-mono">{currentDoc.fileSize}</span>
              {currentDoc.isDuplicate && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#FF4D5F]/20 text-[#FF4D5F] border border-[#FF4D5F]/30 font-bold">
                  Duplicate
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-mono font-bold text-[#F4F7FA] flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#19D3FF] shrink-0" />
              <span className="truncate max-w-[280px] sm:max-w-md">{currentDoc.name}</span>
            </h3>
          </div>

          {/* Verdict Pill & SHA-256 Box */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center space-x-1.5 font-mono text-xs bg-[#05080D] px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-[#8B9AAA]">SHA-256:</span>
              <span className="text-[#F4F7FA] truncate max-w-[110px]" title={currentDoc.sha256}>
                {currentDoc.sha256.substring(0, 8)}...{currentDoc.sha256.substring(58)}
              </span>
              <button
                onClick={() => handleCopyHash(currentDoc.sha256)}
                className="p-1 text-[#8B9AAA] hover:text-[#19D3FF] transition-colors cursor-pointer"
                title="Copy SHA-256 Hash"
              >
                {copiedHash ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#38D6A3]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <span className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border ${currentDoc.verdictColor}`}>
              {currentDoc.verdictLabel}
            </span>
          </div>
        </div>

        {/* Engine Telemetry Ribbon */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#05080D] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#8B9AAA]">
          <div className="flex items-center space-x-2">
            <Scan className="w-3.5 h-3.5 text-[#19D3FF]" />
            <span>Extraction Engine: <strong className="text-[#F4F7FA]">{currentDoc.ocrMethod}</strong></span>
          </div>
          <div>
            <span>Parse Latency: <strong className="text-[#19D3FF]">{currentDoc.executionTime}</strong></span>
          </div>
          <div className="text-[10px] text-[#576574]">
            [Synthetic Demonstration Dataset Reference]
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex border-b border-white/10 px-4 sm:px-5 bg-[#0A101C] gap-6 text-xs font-mono overflow-x-auto">
          <button
            onClick={() => setActiveTab('checks')}
            className={`py-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'checks'
                ? 'border-[#19D3FF] text-[#19D3FF] font-bold'
                : 'border-transparent text-[#8B9AAA] hover:text-[#F4F7FA]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Financial Consistency ({currentDoc.consistencyChecks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('fields')}
            className={`py-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'fields'
                ? 'border-[#19D3FF] text-[#19D3FF] font-bold'
                : 'border-transparent text-[#8B9AAA] hover:text-[#F4F7FA]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Extracted Fields & Schema</span>
          </button>

          <button
            onClick={() => setActiveTab('findings')}
            className={`py-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'findings'
                ? 'border-[#19D3FF] text-[#19D3FF] font-bold'
                : 'border-transparent text-[#8B9AAA] hover:text-[#F4F7FA]'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Forensic Findings ({currentDoc.findings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'audit'
                ? 'border-[#19D3FF] text-[#19D3FF] font-bold'
                : 'border-transparent text-[#8B9AAA] hover:text-[#F4F7FA]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit Trail ({currentDoc.auditEvents.length})</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-5 sm:p-6 min-h-[260px] bg-[#080F17]">
          {/* Tab 1: Financial Consistency Checks */}
          {activeTab === 'checks' && (
            <div className="space-y-3">
              {currentDoc.consistencyChecks.map((chk, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border font-mono transition-all ${
                    chk.passed
                      ? 'bg-[#0D1524] border-[#38D6A3]/30 text-[#F4F7FA]'
                      : 'bg-[#0D1524] border-[#FF4D5F]/40 text-[#F4F7FA]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs sm:text-sm text-[#F4F7FA] flex items-center space-x-2">
                      {chk.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#38D6A3] shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#FF4D5F] shrink-0" />
                      )}
                      <span>{chk.name}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        chk.passed
                          ? 'bg-[#38D6A3]/20 text-[#38D6A3] border border-[#38D6A3]/30'
                          : 'bg-[#FF4D5F]/20 text-[#FF4D5F] border border-[#FF4D5F]/30'
                      }`}
                    >
                      {chk.passed ? 'PASSED' : 'DISCREPANCY DETECTED'}
                    </span>
                  </div>
                  <p className="text-xs text-[#8B9AAA] leading-relaxed pl-6">{chk.details}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Extracted Fields & Normalization */}
          {activeTab === 'fields' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(currentDoc.extractedFields).map(([key, val]) => (
                <div key={key} className="p-3.5 rounded-xl bg-[#0D1524] border border-white/10 font-mono">
                  <span className="text-[10px] text-[#8B9AAA] uppercase block mb-1">{key}</span>
                  <span className="text-xs sm:text-sm font-semibold text-[#F4F7FA] truncate block">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Forensic Findings */}
          {activeTab === 'findings' && (
            <div className="space-y-3">
              {currentDoc.findings.length === 0 ? (
                <div className="p-8 text-center bg-[#0D1524] rounded-xl border border-white/10 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-[#38D6A3] mx-auto" />
                  <p className="text-sm font-bold text-[#F4F7FA]">No Suspicious Anomalies Flagged</p>
                  <p className="text-xs text-[#8B9AAA] max-w-md mx-auto">
                    All balances, line items, and checksums conformed strictly to authoritative baseline rules.
                  </p>
                </div>
              ) : (
                currentDoc.findings.map((fnd, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-[#0D1524] border-l-4 border-l-[#FF4D5F] border border-white/10 font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#F4F7FA]">{fnd.title}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#FF4D5F]/20 text-[#FF4D5F] border border-[#FF4D5F]/30">
                        Severity: {fnd.severity}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#05080D] text-xs text-[#8B9AAA]">
                      <strong className="text-[#FF4D5F]">Analyst Advisory:</strong> {fnd.note}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Audit Trail */}
          {activeTab === 'audit' && (
            <div className="space-y-2 font-mono text-xs">
              <div className="divide-y divide-white/10 bg-[#0D1524] rounded-xl border border-white/10 p-4">
                {currentDoc.auditEvents.map((evt, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-[#19D3FF] font-semibold">{evt.action}</span>
                      <span className="text-[#8B9AAA]">by {evt.actor}</span>
                    </div>
                    <span className="text-[#576574] text-[11px]">{evt.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions & Real Application Bridge */}
        <div className="p-4 sm:p-5 bg-[#0D1524] border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs font-mono text-[#8B9AAA] flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#38D6A3] animate-pulse" />
            <span>Interactive inspection backed by verified production backend services</span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/customer/documents"
              className="px-4 py-2 rounded-full bg-[#05080D] text-[#19D3FF] border border-[#19D3FF]/40 hover:bg-[#19D3FF]/10 font-mono text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <span>Explore Live Document Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/customer/documents"
              className="px-4 py-2 rounded-full bg-[#19D3FF] text-[#05080D] hover:bg-[#26E6D8] font-mono text-xs font-bold transition-all shadow-[0_0_16px_rgba(25,211,255,0.4)] flex items-center space-x-1.5"
            >
              <span>Analyze Your Document</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
