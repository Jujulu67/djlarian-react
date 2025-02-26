'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import type { ButtonSize, ButtonVariant } from '@/types';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isFullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isFullWidth = false,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ): JSX.Element => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-md transition-all';

    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
      secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500',
      outline:
        'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
      ghost: 'text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const classes = clsx(
      baseStyles,
      variants[variant],
      sizes[size],
      isFullWidth && 'w-full',
      (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-900',
      className
    );

    return (
      <button ref={ref} type={type} className={classes} disabled={disabled || isLoading} {...props}>
        {isLoading ? (
          <span className="flex items-center">
            <svg
              className="w-4 h-4 mr-2 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Chargement...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
