import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isFullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, helperText, isFullWidth = false, id, ...props },
    ref
  ): JSX.Element => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const baseStyles =
      'block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm transition-colors';

    const classes = clsx(
      baseStyles,
      error &&
        'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500',
      isFullWidth && 'w-full',
      'dark:bg-dark-800 dark:border-dark-700 dark:text-white dark:placeholder-dark-400',
      className
    );

    return (
      <div className={clsx('flex flex-col', isFullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={classes}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" id={`${inputId}-error`}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400" id={`${inputId}-helper`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
