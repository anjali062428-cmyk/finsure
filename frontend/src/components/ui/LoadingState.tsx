import React from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  fullHeight = false,
  className = '',
}) => {
  const spinnerSizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  }[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-6 text-center ${
        fullHeight ? 'min-h-[300px]' : ''
      } ${className}`}
    >
      <div
        className={`${spinnerSizes} rounded-full border-accent border-t-transparent animate-spin mb-3`}
      />
      {message && <p className="text-sm text-text-muted">{message}</p>}
      <span className="sr-only">Loading</span>
    </div>
  );
};
