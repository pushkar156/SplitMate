import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = 'text', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-foreground-muted">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border border-border bg-card-elevated/50 px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-foreground-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error && 'border-negative focus-visible:ring-negative',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-negative font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-foreground-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
