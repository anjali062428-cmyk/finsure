import React from 'react';
import { AlertCircle } from 'lucide-react';

export const MockDisclaimerBanner: React.FC<{ message?: string; className?: string }> = ({
  message = 'Development Preview Mode: Synthetic Data Active. Not connected to live production ledger.',
  className = '',
}) => {
  return (
    <div
      role="note"
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-md bg-warning/10 border border-warning/30 text-warning text-xs font-mono select-none ${className}`}
    >
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
