import React from 'react';
import { Badge } from './Badge';

export interface StatusBadgeProps {
  status: string;
  type?: 'priority' | 'decision' | 'case_status' | 'general';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'general', size = 'md' }) => {
  const norm = (status || '').toLowerCase().replace(/[\s_-]+/g, '_');

  let variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' = 'default';
  let label = status.replace(/_/g, ' ');

  if (type === 'priority') {
    switch (norm) {
      case 'critical':
        variant = 'danger';
        label = 'CRITICAL';
        break;
      case 'high':
        variant = 'warning';
        label = 'HIGH';
        break;
      case 'medium':
        variant = 'info';
        label = 'MEDIUM';
        break;
      case 'low':
        variant = 'default';
        label = 'LOW';
        break;
    }
  } else if (type === 'decision') {
    switch (norm) {
      case 'allow':
        variant = 'success';
        label = 'ALLOW';
        break;
      case 'flag':
        variant = 'info';
        label = 'FLAG';
        break;
      case 'step_up':
        variant = 'warning';
        label = 'STEP-UP';
        break;
      case 'block':
        variant = 'danger';
        label = 'BLOCK';
        break;
    }
  } else if (type === 'case_status') {
    switch (norm) {
      case 'new':
        variant = 'info';
        label = 'New';
        break;
      case 'under_investigation':
        variant = 'accent';
        label = 'Under Investigation';
        break;
      case 'escalated':
        variant = 'warning';
        label = 'Escalated';
        break;
      case 'confirmed_fraud':
        variant = 'danger';
        label = 'Confirmed Fraud';
        break;
      case 'dismissed':
        variant = 'default';
        label = 'Dismissed';
        break;
      case 'closed':
        variant = 'default';
        label = 'Closed';
        break;
    }
  } else {
    if (['active', 'success', 'verified', 'passed'].includes(norm)) variant = 'success';
    else if (['pending', 'investigating', 'warning'].includes(norm)) variant = 'warning';
    else if (['failed', 'blocked', 'rejected', 'error'].includes(norm)) variant = 'danger';
  }

  return (
    <Badge variant={variant} size={size} className="uppercase tracking-wider font-semibold text-[10px]">
      {label}
    </Badge>
  );
};
