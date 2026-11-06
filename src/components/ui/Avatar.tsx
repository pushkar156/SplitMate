import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm font-medium',
    lg: 'h-12 w-12 text-base font-medium',
    xl: 'h-16 w-16 text-lg font-semibold',
  };

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-primary-muted text-primary border border-border select-none',
        sizeClasses[size],
        className
      )}
    >
      {src && !imageFailed ? (
        <img
          src={src}
          alt={name}
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{getInitials(name || 'User')}</span>
      )}
    </div>
  );
};

