import React from 'react';
import { Eye, Table } from 'lucide-react';
import { Button } from '../ui/Button';

interface Fallback2DViewProps {
  title: string;
  reason?: string;
  dataSummary?: Record<string, string | number>;
  onToggle3D?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const Fallback2DView: React.FC<Fallback2DViewProps> = ({
  title,
  reason = '2D accessibility mode active',
  dataSummary,
  onToggle3D,
  className = '',
  children,
}) => {
  return (
    <div
      className={`p-5 bg-surface border border-border rounded-lg flex flex-col justify-between ${className}`}
      role="region"
      aria-label={`${title} 2D Fallback View`}
    >
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
          <div className="flex items-center space-x-2">
            <Table className="w-4 h-4 text-accent" />
            <h4 className="text-sm font-semibold text-text">{title} (2D Equivalent)</h4>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-muted text-text-muted border border-border">
            {reason}
          </span>
        </div>

        {dataSummary && Object.keys(dataSummary).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {Object.entries(dataSummary).map(([key, val]) => (
              <div key={key} className="p-2.5 bg-surface-muted rounded border border-border/50">
                <span className="text-[11px] text-text-muted block uppercase tracking-wider font-mono">
                  {key}
                </span>
                <span className="text-sm font-semibold text-text font-mono">
                  {val}
                </span>
              </div>
            ))}
          </div>
        )}

        {children}
      </div>

      {onToggle3D && (
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center space-x-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Prefer spatial 3D visualization?</span>
          </div>
          <Button variant="outline" size="sm" onClick={onToggle3D} className="text-xs h-7">
            Switch to 3D
          </Button>
        </div>
      )}
    </div>
  );
};
