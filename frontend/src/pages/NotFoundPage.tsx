import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background text-text">
      <div className="w-16 h-16 mb-4 rounded-full bg-risk-critical/10 text-risk-critical flex items-center justify-center">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold font-mono tracking-tight mb-2">404</h1>
      <h2 className="text-lg font-semibold text-text mb-1">Route Not Found</h2>
      <p className="text-xs text-text-muted max-w-sm mb-6">
        The requested resource path does not exist or has been relocated within the FinSure secure perimeter.
      </p>
      <Link to="/">
        <Button variant="primary" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Return to FinSure Home</span>
        </Button>
      </Link>
    </div>
  );
};
