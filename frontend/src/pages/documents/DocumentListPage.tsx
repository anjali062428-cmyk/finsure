import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  RefreshCw,
  CheckCircle2,
  Copy,
  Download,
  Database,
  Eye,
  Cpu,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { documentsApi } from '../../api/documents';
import { DocumentRecord, OcrStatusResponse } from '../../types/document';
import { DocumentUploadModal } from './DocumentUploadModal';
import { AuthorizedLedgerModal } from './AuthorizedLedgerModal';
import { useAuth } from '../../context/AuthContext';

export const DocumentListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [ocrStatus, setOcrStatus] = useState<OcrStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [docs, ocr] = await Promise.all([
        documentsApi.listDocuments({ limit: 100 }),
        documentsApi.getOcrStatus().catch(() => ({ available: false, status: 'OCR status unavailable' })),
      ]);
      setDocuments(docs);
      setOcrStatus(ocr);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch financial documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      await documentsApi.downloadDocumentFile(doc.document_id, doc.filename);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = documents.length;
    const consistent = documents.filter((d) => d.verdict === 'no_significant_anomalies').length;
    const anomalies = documents.filter(
      (d) => d.verdict === 'review_recommended' || d.verdict === 'high_risk_indicators'
    ).length;
    const duplicates = documents.filter((d) => d.is_duplicate).length;
    return { total, consistent, anomalies, duplicates };
  }, [documents]);

  // Filtered List
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        searchQuery === '' ||
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.document_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.sha256_hash.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [documents, searchQuery, typeFilter, statusFilter]);

  const basePath = user?.role === 'customer' ? '/customer/documents' : '/analyst/documents';

  const columns: Column<DocumentRecord>[] = [
    {
      key: 'filename',
      header: 'Document Name & Claim',
      render: (doc: DocumentRecord) => (
        <div className="flex flex-col">
          <Link
            to={`${basePath}/${doc.document_id}`}
            className="font-medium text-[#F5F6F8] hover:text-[#BFE8F5] transition-colors truncate max-w-[260px] flex items-center space-x-1.5"
          >
            <FileText className="w-4 h-4 shrink-0 text-[#BFE8F5]" />
            <span className="truncate">{doc.filename}</span>
          </Link>
          <div className="flex items-center space-x-2 mt-1">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-white/70 border border-white/10">
              {doc.claim_label}
            </span>
            <span className="text-[11px] text-white/40">
              {(doc.file_size / 1024).toFixed(1)} KB
            </span>
            {doc.is_duplicate && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Duplicate
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'document_type',
      header: 'Type',
      render: (doc: DocumentRecord) => {
        const typeLabels: Record<string, { label: string; color: string }> = {
          bank_statement: { label: 'Bank Statement', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
          invoice: { label: 'Invoice / Bill', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
          payment_receipt: { label: 'Payment Receipt', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
          other: { label: 'Other', color: 'bg-white/10 text-white/60 border-white/20' },
        };
        const info = typeLabels[doc.document_type] || typeLabels.other;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${info.color}`}>
            {info.label}
          </span>
        );
      },
    },
    {
      key: 'sha256_hash',
      header: 'SHA-256 Hash',
      render: (doc: DocumentRecord) => (
        <div className="flex items-center space-x-1 font-mono text-xs text-white/60">
          <span className="truncate max-w-[110px]" title={doc.sha256_hash}>
            {doc.sha256_hash.substring(0, 10)}...{doc.sha256_hash.substring(58)}
          </span>
          <button
            onClick={() => handleCopyHash(doc.sha256_hash)}
            className="p-1 hover:text-white transition-colors"
            title="Copy SHA-256 Checksum"
          >
            {copiedHash === doc.sha256_hash ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'verdict',
      header: 'Verification Verdict',
      render: (doc: DocumentRecord) => {
        if (!doc.verdict) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30">
              Uploaded (Pending)
            </span>
          );
        }
        const verdictBadges: Record<string, { label: string; cls: string }> = {
          no_significant_anomalies: {
            label: 'Consistent',
            cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          },
          review_recommended: {
            label: 'Review Advised',
            cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          },
          high_risk_indicators: {
            label: 'High Risk Discrepancy',
            cls: 'bg-red-500/10 text-red-400 border-red-500/30',
          },
          verification_incomplete: {
            label: 'Verification Incomplete',
            cls: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          },
        };
        const v = verdictBadges[doc.verdict] || { label: doc.verdict, cls: 'bg-white/10 text-white/70 border-white/20' };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${v.cls}`}>
            {v.label}
          </span>
        );
      },
    },
    {
      key: 'review_status',
      header: 'Review State',
      render: (doc: DocumentRecord) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
            doc.review_status === 'confirmed'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              : doc.review_status === 'reviewed'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
              : 'bg-white/5 text-white/60 border border-white/10'
          }`}
        >
          {doc.review_status}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Uploaded',
      render: (doc: DocumentRecord) => (
        <span className="text-xs text-white/50">
          {new Date(doc.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (doc: DocumentRecord) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`${basePath}/${doc.document_id}`)}
            className="flex items-center space-x-1 py-1 px-2.5 text-xs text-[#BFE8F5]"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Verify</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(doc)}
            title="Download original file"
            className="p-1.5 text-white/60 hover:text-white"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Financial Document Verification Platform"
        description="Ingest bank statements, invoices, and payment receipts with digital PDF extraction, bounded OCR fallback, financial consistency checks, and authorized ledger cross-matching."
        actions={
          <div className="flex items-center space-x-3">
            {ocrStatus && (
              <div
                className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono ${
                  ocrStatus.available
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
                title={ocrStatus.status}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>{ocrStatus.available ? 'OCR Engine Ready (Tesseract)' : 'OCR Engine Standby'}</span>
              </div>
            )}
            {user?.role !== 'customer' && (
              <Button
                variant="secondary"
                onClick={() => setIsLedgerOpen(true)}
                className="flex items-center space-x-2 text-xs"
              >
                <Database className="w-4 h-4 text-[#BFE8F5]" />
                <span>Authorized Ledger</span>
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center space-x-2 bg-[#BFE8F5] text-[#101827] hover:bg-white font-medium text-xs shadow-[0_0_15px_rgba(191,232,245,0.3)]"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </Button>
            <Button
              variant="ghost"
              onClick={fetchDocuments}
              className="p-2 text-white/70 hover:text-white"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#080F17] border-white/10">
          <p className="text-xs text-white/50 uppercase font-mono tracking-wider">Total Documents</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">{metrics.total}</p>
        </Card>
        <Card className="p-4 bg-[#080F17] border-white/10">
          <p className="text-xs text-white/50 uppercase font-mono tracking-wider">Consistent Records</p>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{metrics.consistent}</p>
        </Card>
        <Card className="p-4 bg-[#080F17] border-white/10">
          <p className="text-xs text-white/50 uppercase font-mono tracking-wider">Anomalies Detected</p>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{metrics.anomalies}</p>
        </Card>
        <Card className="p-4 bg-[#080F17] border-white/10">
          <p className="text-xs text-white/50 uppercase font-mono tracking-wider">Duplicate Files</p>
          <p className="text-2xl font-bold font-mono text-rose-400 mt-1">{metrics.duplicates}</p>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 bg-[#080F17] border-white/10 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Search by filename, SHA-256 hash, or document ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Select
              options={[
                { label: 'All Document Types', value: 'all' },
                { label: 'Bank Statements', value: 'bank_statement' },
                { label: 'Invoices / Bills', value: 'invoice' },
                { label: 'Payment Receipts', value: 'payment_receipt' },
              ]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
          </div>
          <div>
            <Select
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Uploaded', value: 'uploaded' },
                { label: 'Analyzed', value: 'analyzed' },
                { label: 'Flagged', value: 'flagged' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Main Table */}
      {isLoading ? (
        <LoadingState message="Loading documents from secure storage..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDocuments} />
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          title="No Financial Documents Found"
          description={
            searchQuery
              ? 'No documents matched your search criteria.'
              : 'Start by uploading a bank statement, invoice, or payment receipt for verification.'
          }
          actionLabel="Upload First Document"
          onAction={() => setIsUploadOpen(true)}
        />
      ) : (
        <Card className="bg-[#080F17] border-white/10 overflow-hidden">
          <Table
            columns={columns}
            data={filteredDocuments}
            keyExtractor={(doc) => doc.document_id}
          />
        </Card>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(docId) => {
          fetchDocuments();
          navigate(`${basePath}/${docId}`);
        }}
      />

      {/* Authorized Ledger Modal */}
      <AuthorizedLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
      />
    </div>
  );
};
