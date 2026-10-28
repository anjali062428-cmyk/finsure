import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An error occurred',
  message = 'Failed to load content. Please verify your connection or try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 text-center bg-risk-critical/5 border border-risk-critical/20 rounded-lg ${className}`}
    >
      <div className="w-12 h-12 mb-3 rounded-full bg-risk-critical/10 flex items-center justify-center text-risk-critical">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-text mb-1">{title}</h3>
      <p className="text-sm text-text-muted max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="flex items-center space-x-1.5">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          <span>Retry</span>
        </Button>
      )}
    </div>
  );
};
