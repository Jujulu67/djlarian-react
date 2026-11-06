import React from 'react';

import { cn } from '@/lib/utils/cn';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
  checked?: boolean;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, onChange, checked, ...props }, ref) => {
    return (
      // Le label transmet le clic à la case (sr-only) : clavier et lecteurs d'écran inclus
      <label
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-purple-600' : 'bg-gray-700',
          className
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          checked={checked}
          {...props}
          onChange={(e) => {
            onCheckedChange?.(e.target.checked);
            onChange?.(e);
          }}
        />
      </label>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
