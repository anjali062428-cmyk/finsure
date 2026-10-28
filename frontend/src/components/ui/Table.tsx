import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  onRowClick?: (item: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records found',
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  className = '',
  ariaLabel = 'Data table',
}: TableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto rounded-lg border border-border bg-surface ${className}`}>
      <table className="w-full text-left border-collapse text-sm" aria-label={ariaLabel}>
        <thead className="bg-surface-muted border-b border-border text-xs uppercase tracking-wider text-text-muted select-none">
          <tr>
            {columns.map((col) => {
              const isSorted = sortColumn === col.key;
              const alignClass = {
                left: 'text-left',
                center: 'text-center',
                right: 'text-right',
              }[col.align || 'left'];

              return (
                <th
                  key={col.key}
                  scope="col"
                  style={{ width: col.width }}
                  className={`px-4 py-3 font-semibold ${alignClass} ${col.className || ''} ${
                    col.sortable ? 'cursor-pointer hover:text-text' : ''
                  }`}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <div className={`inline-flex items-center space-x-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="inline-flex flex-col text-xs">
                        {isSorted && sortDirection === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-accent" />
                        ) : isSorted && sortDirection === 'desc' ? (
                          <ChevronDown className="w-3.5 h-3.5 text-accent" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 opacity-30" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  <span>Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                onClick={() => onRowClick && onRowClick(item)}
                className={`transition-colors ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-surface-elevated'
                    : 'hover:bg-surface-muted/40'
                }`}
              >
                {columns.map((col) => {
                  const alignClass = {
                    left: 'text-left',
                    center: 'text-center',
                    right: 'text-right',
                  }[col.align || 'left'];

                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-text ${alignClass} ${col.className || ''}`}
                    >
                      {col.render
                        ? col.render(item, index)
                        : (item as Record<string, any>)[col.key] ?? '—'}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
