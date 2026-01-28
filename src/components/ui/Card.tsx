import clsx from 'clsx';
import type { ReactNode } from 'react';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';
import type { BaseComponentProps } from '@/types';

interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  isHoverable?: boolean;
  isInteractive?: boolean;
}

export const Card = ({
  children,
  className,
  title,
  subtitle,
  footer,
  isHoverable = false,
  isInteractive = false,
}: CardProps): React.JSX.Element => {
  const baseStyles =
    'overflow-hidden rounded-lg bg-white shadow dark:bg-dark-800 transition-all duration-200';

  const classes = clsx(
    baseStyles,
    isHoverable && 'hover:shadow-lg hover:-translate-y-1',
    isInteractive && 'cursor-pointer',
    className
  );

  return (
    <div className={classes}>
      {(title || subtitle) && (
        <div className="px-4 py-5 sm:px-6">
          {title && (
            <h3 className="text-lg font-medium leading-6 !text-gray-900 dark:!text-white">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm !text-gray-500 dark:!text-gray-400">{subtitle}</p>
          )}
        </div>
      )}
      <div className="px-4 py-5 sm:p-6">{children}</div>
      {footer && (
        <div className="border-t border-gray-200 dark:border-dark-700 px-4 py-4 sm:px-6">
          {footer}
        </div>
      )}
    </div>
  );
};

// --- Ajout des sous-composants standard shadcn/ui ---

const CardComponent = React.forwardRef<
  // Renommé pour éviter conflit
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
    {...props}
  />
));
CardComponent.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

// Exporte ton Card original ET les nouveaux sous-composants
export {
  CardComponent as ShadCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
