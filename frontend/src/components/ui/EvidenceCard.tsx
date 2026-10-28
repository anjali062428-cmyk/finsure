import React from 'react';
import { ShieldCheck, Hash, Clock, FileSpreadsheet } from 'lucide-react';
import { Card } from './Card';
import { EvidenceChip } from './EvidenceChip';

interface EvidenceCardProps {
  evidenceId: string;
  type: string;
  source: string;
  title: string;
  details: Record<string, any>;
  timestamp: string;
  hash?: string;
  isVerified?: boolean;
  className?: string;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidenceId,
  type,
  source,
  title,
  details,
  timestamp,
  hash,
  isVerified = true,
  className = '',
}) => {
  return (
    <Card className={`p-4 hover:border-accent/40 transition-colors ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center space-x-2">
          <EvidenceChip id={evidenceId} type={type} />
          <span className="text-xs uppercase font-mono px-1.5 py-0.5 rounded bg-surface-muted text-text-muted">
            {type}
          </span>
        </div>
        {isVerified && (
          <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-accent-teal">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Chain Verified</span>
          </span>
        )}
      </div>

      <h4 className="text-sm font-semibold text-text mb-1">{title}</h4>

      <div className="flex items-center space-x-4 text-xs text-text-muted mb-3">
        <div className="flex items-center space-x-1">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Source: {source}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{new Date(timestamp).toLocaleString()}</span>
        </div>
      </div>

      {details && Object.keys(details).length > 0 && (
        <div className="bg-surface-muted rounded p-2.5 mb-3 border border-border/60 text-xs font-mono">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(details).map(([key, val]) => (
              <div key={key} className="flex justify-between py-0.5 border-b border-border/30 last:border-0">
                <span className="text-text-muted">{key}:</span>
                <span className="text-text font-medium truncate max-w-[140px]" title={String(val)}>
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hash && (
        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-text-muted">
          <div className="flex items-center space-x-1">
            <Hash className="w-3 h-3" />
            <span>SHA-256:</span>
          </div>
          <span className="truncate max-w-[220px]" title={hash}>
            {hash}
          </span>
        </div>
      )}
    </Card>
  );
};
