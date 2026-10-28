import React from 'react';
import { ShieldCheck, FileText, Activity, User, Smartphone } from 'lucide-react';

interface EvidenceChipProps {
  id: string;
  type?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}

export const EvidenceChip: React.FC<EvidenceChipProps> = ({
  id,
  type = 'evidence',
  label,
  onClick,
  className = '',
}) => {
  const getIcon = () => {
    switch (type.toLowerCase()) {
      case 'shap':
      case 'ml':
        return <Activity className="w-3 h-3 text-accent" />;
      case 'device':
        return <Smartphone className="w-3 h-3 text-risk-medium" />;
      case 'user':
        return <User className="w-3 h-3 text-risk-low" />;
      case 'chain':
        return <ShieldCheck className="w-3 h-3 text-accent-teal" />;
      default:
        return <FileText className="w-3 h-3 text-text-muted" />;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono border border-border bg-surface-muted transition-colors ${
        onClick
          ? 'cursor-pointer hover:bg-surface-elevated hover:border-accent text-accent'
          : 'cursor-default text-text-muted'
      } ${className}`}
    >
      {getIcon()}
      <span className="font-semibold">{id}</span>
      {label && <span className="text-text-muted font-sans font-normal ml-1">· {label}</span>}
    </button>
  );
};
