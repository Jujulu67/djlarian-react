import * as React from 'react';

import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50',
          'v2:rounded-xl v2:border-white/10 v2:bg-white/[0.03] v2:backdrop-blur-md v2:transition-[border-color,box-shadow,background-color] v2:duration-200 v2:placeholder-white/35 v2:hover:border-white/20 v2:focus:border-brand/70 v2:focus:bg-white/[0.05] v2:focus:ring-4 v2:focus:ring-brand/15',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
