import type { ReactNode } from 'react';
import clsx from 'clsx';
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
}: CardProps): JSX.Element => {
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
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">{title}</h3>
          )}
          {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
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
