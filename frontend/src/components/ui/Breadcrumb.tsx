import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showHome = true,
  className = '',
}) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center space-x-1.5 text-xs text-text-muted ${className}`}>
      {showHome && (
        <>
          <span className="flex items-center text-text-muted hover:text-text transition-colors">
            <Home className="w-3.5 h-3.5" />
          </span>
          <ChevronRight className="w-3 h-3 text-text-muted/60" />
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={item.label}>
            {isLast ? (
              <span className="font-medium text-text truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            ) : item.href ? (
              <a
                href={item.href}
                className="hover:text-text transition-colors truncate max-w-[150px]"
              >
                {item.label}
              </a>
            ) : item.onClick ? (
              <button
                type="button"
                onClick={item.onClick}
                className="hover:text-text transition-colors truncate max-w-[150px]"
              >
                {item.label}
              </button>
            ) : (
              <span className="truncate max-w-[150px]">{item.label}</span>
            )}

            {!isLast && <ChevronRight className="w-3 h-3 text-text-muted/60 shrink-0" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
