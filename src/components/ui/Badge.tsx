import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-muted text-primary',
        secondary: 'border-transparent bg-secondary-muted text-secondary',
        positive: 'border-transparent bg-positive-bg text-positive',
        negative: 'border-transparent bg-negative-bg text-negative',
        outline: 'border-border text-foreground-muted',
        neutral: 'border-transparent bg-card-elevated text-foreground-muted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
};
