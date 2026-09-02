import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export const ErrorState = ({
  title = 'Something went wrong',
  description = 'Failed to fetch data or process your request. Please try again.',
  onRetry,
  className,
}) => {
  return (
    <div className={cn('p-6 bg-rose-50/60 border border-rose-200 rounded-2xl text-center flex flex-col items-center', className)}>
      <div className="p-3 bg-rose-100 text-rose-600 rounded-xl mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-rose-900">{title}</h3>
      <p className="text-xs text-rose-700 max-w-md mt-1 mb-4 leading-relaxed">{description}</p>
      {onRetry && (
        <Button variant="danger" size="sm" leftIcon={RefreshCw} onClick={onRetry}>
          Retry Request
        </Button>
      )}
    </div>
  );
};
