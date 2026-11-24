import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle, X, Loader2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { documentsApi } from '../../api/documents';
import { DocumentType } from '../../types/document';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (docId: string) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('bank_statement');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

  const handleFileSelection = (selectedFile: File) => {
    setError(null);
    if (selectedFile.size > MAX_SIZE_BYTES) {
      setError(`File size (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB) exceeds 25 MB limit.`);
      return;
    }
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const validExts = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif'];
    if (!ext || !validExts.includes(ext)) {
      setError(`Unsupported file type (.${ext}). Supported formats: PDF, PNG, JPG, JPEG, TIFF.`);
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const resp = await documentsApi.uploadDocument(file, documentType, notes);
      setFile(null);
      setNotes('');
      onClose();

      if (onUploadSuccess) {
        onUploadSuccess(resp.document_id);
      } else {
        navigate(`/analyst/documents/${resp.document_id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload document. Please check file format.');
    } finally {
      setIsUploading(false);
    }
  };

  const typeOptions = [
    { label: 'Bank Statement', value: 'bank_statement' },
    { label: 'Invoice / Bill', value: 'invoice' },
    { label: 'Payment Receipt (payment_claim)', value: 'payment_receipt' },
    { label: 'Other Document', value: 'other' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Financial Document">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag and Drop Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-[#BFE8F5] bg-[#BFE8F5]/10'
              : 'border-[rgba(191,232,245,0.15)] hover:border-[#BFE8F5]/40 bg-[#101827]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelection(e.target.files[0]);
              }
            }}
          />

          {file ? (
            <div className="flex items-center space-x-3 text-left">
              <div className="p-2.5 rounded-lg bg-[#2C3480]/30 text-[#BFE8F5]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-[#F5F6F8] truncate max-w-[280px]">{file.name}</p>
                <p className="text-xs text-[#B7B7B7]">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Document'}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#162032] flex items-center justify-center mx-auto mb-3 text-[#BFE8F5]">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-[#F5F6F8] mb-1">
                Click to browse or drag file here
              </p>
              <p className="text-xs text-[#B7B7B7]">
                Supports PDF, PNG, JPG, TIFF (Max 25 MB)
              </p>
            </div>
          )}
        </div>

        {/* Document Type Selector */}
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">
            Document Type
          </label>
          <Select
            options={typeOptions}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          />
          {documentType === 'payment_receipt' && (
            <p className="text-[11px] text-[#BFE8F5] mt-1">
              Note: Payment receipts are strictly classified as <code>payment_claim</code>, not settled payments.
            </p>
          )}
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">
            Analyst / Customer Notes (Optional)
          </label>
          <Input
            placeholder="e.g., Vendor claim Q3 tax invoice review"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end space-x-3 pt-3 border-t border-[rgba(191,232,245,0.12)]">
          <Button variant="ghost" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!file || isUploading}
            className="flex items-center space-x-2 bg-[#BFE8F5] text-[#101827] hover:bg-white font-medium shadow-[0_0_15px_rgba(191,232,245,0.3)]"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading & Validating...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload & Ingest</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
