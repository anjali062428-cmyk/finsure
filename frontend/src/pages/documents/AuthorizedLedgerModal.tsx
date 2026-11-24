import React, { useState, useEffect } from 'react';
import {
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, Column } from '../../components/ui/Table';
import { documentsApi } from '../../api/documents';
import { AuthorizedTransaction } from '../../types/document';

interface AuthorizedLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthorizedLedgerModal: React.FC<AuthorizedLedgerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [records, setRecords] = useState<AuthorizedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchRef, setSearchRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchRecords = async (refFilter?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await documentsApi.listAuthorizedTransactions({
        reference_id: refFilter || undefined,
        limit: 50,
      });
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to query authorized ledger.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecords();
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords(searchRef);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsImporting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const resp = await documentsApi.importAuthorizedLedger(file);
      setSuccessMsg(resp.message);
      fetchRecords();
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV into authorized ledger.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const columns: Column<AuthorizedTransaction>[] = [
    {
      key: 'reference_id',
      header: 'Reference ID (UTR)',
      render: (row: AuthorizedTransaction) => (
        <span className="font-mono text-xs text-[#BFE8F5] font-semibold">
          {row.reference_id}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: AuthorizedTransaction) => (
        <span className="font-mono font-medium text-white">
          ₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'account_number',
      header: 'Account / VPAs',
      render: (row: AuthorizedTransaction) => (
        <div className="text-xs">
          {row.account_number && <div className="text-white/80">A/c: {row.account_number}</div>}
          {row.payer_vpa && <div className="text-white/50 truncate max-w-[140px]">{row.payer_vpa}</div>}
        </div>
      ),
    },
    {
      key: 'transaction_date',
      header: 'Transaction Date',
      render: (row: AuthorizedTransaction) => (
        <span className="text-xs text-white/60">
          {new Date(row.transaction_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'provenance',
      header: 'Provenance',
      render: (row: AuthorizedTransaction) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
            row.is_synthetic
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {row.is_synthetic ? 'Synthetic Benchmark' : 'Authorized Feed'}
        </span>
      ),
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Authorized Transaction Ledger (Record Matching Store)">
      <div className="space-y-4 max-w-4xl">
        {/* Synthetic Disclaimer Banner */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start space-x-2 text-xs text-blue-300">
          <Database className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
          <span>
            The Authorized Ledger contains validated transaction records used to cross-reference payment receipts, invoices, and statements. Demo records seeded from the FinSure synthetic dataset are marked with the <strong>Synthetic Benchmark</strong> badge.
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start space-x-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Toolbar: Search + CSV Upload */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto flex-1">
            <Input
              placeholder="Search reference (UTR), amount, account..."
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="secondary" className="shrink-0 flex items-center space-x-1">
              <Search className="w-4 h-4" />
              <span>Filter</span>
            </Button>
            {searchRef && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchRef('');
                  fetchRecords('');
                }}
              >
                Clear
              </Button>
            )}
          </form>

          <div className="flex items-center space-x-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center space-x-2 text-xs"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Authorized CSV</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => fetchRecords(searchRef)}
              disabled={isLoading}
              className="p-2 text-white/70 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Records Table */}
        <div className="border border-white/10 rounded-lg overflow-hidden max-h-[360px] overflow-y-auto">
          <Table
            columns={columns}
            data={records}
            keyExtractor={(row) => row.record_id}
            emptyMessage={isLoading ? 'Querying ledger records...' : 'No authorized records found matching query.'}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-white/50 pt-2 border-t border-white/10">
          <span>Showing {records.length} authorized records</span>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
