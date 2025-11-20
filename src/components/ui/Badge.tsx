import { VariantProps, cva } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 cursor-default',
  {
    variants: {
      variant: {
        default: 'bg-purple-600/90 text-white hover:bg-purple-600',
        secondary: 'bg-blue-600/90 text-white hover:bg-blue-600',
        destructive: 'bg-red-600/90 text-white hover:bg-red-600',
        outline: 'text-purple-300 border border-purple-600/50 hover:bg-purple-900/20',
        success: 'bg-green-600/90 text-white hover:bg-green-600',
        warning: 'bg-amber-600/90 text-white hover:bg-amber-600',
        ghost: 'bg-gray-800/80 text-gray-300 hover:bg-gray-800',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[0.65rem]',
        lg: 'px-3 py-1 text-sm',
      },
      interactive: {
        true: 'cursor-pointer',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      interactive: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, interactive, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, interactive }), className)}
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
