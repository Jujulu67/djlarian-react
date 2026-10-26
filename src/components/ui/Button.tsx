'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    // v2 : coins plus doux, retour tactile, transitions sur transform/ombres
    'v2:gap-2 v2:rounded-xl v2:font-semibold v2:transition-[transform,background-color,border-color,box-shadow,filter] v2:duration-200 v2:ease-[cubic-bezier(0.16,1,0.3,1)] v2:active:scale-[0.97] v2:focus-visible:ring-offset-0 v3:rounded-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-purple-600 text-white hover:bg-purple-700 v2:bg-gradient-to-b v2:from-brand v2:to-purple-600 v2:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_8px_24px_-10px_rgb(var(--brand)/0.7)] v2:hover:brightness-110 v2:hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_12px_32px_-10px_rgb(var(--brand)/0.9)] v3:bg-none v3:bg-[rgb(var(--ink))] v3:text-[rgb(5_5_6)] v3:shadow-none v3:hover:bg-white v3:hover:shadow-none v3:hover:brightness-100',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 v2:bg-red-500/90 v2:shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] v2:hover:bg-red-500',
        outline:
          'border border-gray-700 bg-transparent text-white hover:bg-gray-800 v2:border-white/12 v2:bg-white/[0.03] v2:backdrop-blur-md v2:hover:border-white/25 v2:hover:bg-white/[0.07] v3:border-white/25 v3:bg-transparent v3:backdrop-blur-none v3:hover:border-white v3:hover:bg-transparent',
        secondary: 'bg-gray-700 text-white hover:bg-gray-600 v2:surface-2 v2:hover:bg-white/10',
        ghost: 'hover:bg-gray-800 text-white v2:hover:bg-white/[0.06]',
        link: 'text-purple-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
