import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, ShieldAlert, Circle } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  status?: 'success' | 'warning' | 'error' | 'pending' | 'default';
  icon?: React.ReactNode;
  metadata?: Record<string, string | number>;
  hash?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
  showHash?: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({
  events,
  className = '',
  showHash = false,
}) => {
  const getStatusIcon = (status?: TimelineEvent['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-risk-low" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-risk-medium" />;
      case 'error':
        return <ShieldAlert className="w-4 h-4 text-risk-critical" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-accent" />;
      default:
        return <Circle className="w-3 h-3 text-text-muted fill-current" />;
    }
  };

  const getBorderColor = (status?: TimelineEvent['status']) => {
    switch (status) {
      case 'success':
        return 'border-risk-low/40';
      case 'warning':
        return 'border-risk-medium/40';
      case 'error':
        return 'border-risk-critical/40';
      case 'pending':
        return 'border-accent/40';
      default:
        return 'border-border';
    }
  };

  return (
    <div className={`relative pl-6 space-y-6 ${className}`}>
      {/* Vertical spine */}
      <div className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-border -translate-x-1/2" />

      {events.map((evt, idx) => (
        <div key={evt.id || idx} className="relative flex items-start space-x-3 group">
          {/* Node Icon */}
          <div
            className={`absolute -left-6 top-1 w-5 h-5 rounded-full bg-surface border flex items-center justify-center -translate-x-1/2 ${getBorderColor(
              evt.status
            )}`}
          >
            {evt.icon || getStatusIcon(evt.status)}
          </div>

          <div className="flex-1 bg-surface-elevated/40 border border-border/80 rounded-md p-3.5 hover:border-border transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="text-sm font-semibold text-text">{evt.title}</h4>
              <time className="text-xs font-mono text-text-muted shrink-0">
                {new Date(evt.timestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </time>
            </div>

            {evt.description && (
              <p className="text-xs text-text-muted leading-relaxed mb-2">{evt.description}</p>
            )}

            {evt.metadata && Object.keys(evt.metadata).length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-surface-muted p-2 rounded border border-border/60">
                {Object.entries(evt.metadata).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-text-muted">{key}:</span>
                    <span className="text-text font-medium">{val}</span>
                  </div>
                ))}
              </div>
            )}

            {showHash && evt.hash && (
              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span>SHA-256:</span>
                <span className="truncate max-w-[200px]" title={evt.hash}>
                  {evt.hash}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
