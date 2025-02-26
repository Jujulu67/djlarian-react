import { forwardRef, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  options: Option[];
  error?: string;
  helperText?: string;
  isFullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, options, error, helperText, isFullWidth = false, id, ...props },
    ref
  ): JSX.Element => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const baseStyles =
      'block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm transition-colors';

    const classes = clsx(
      baseStyles,
      error && 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500',
      isFullWidth && 'w-full',
      'dark:bg-dark-800 dark:border-dark-700 dark:text-white',
      className
    );

    return (
      <div className={clsx('flex flex-col', isFullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={classes}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            {...props}
          >
            {options.map(({ value, label: optionLabel, disabled }) => (
              <option key={value} value={value} disabled={disabled}>
                {optionLabel}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
            <svg
              className="h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" id={`${selectId}-error`}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400" id={`${selectId}-helper`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
