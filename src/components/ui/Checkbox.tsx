import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  labelClassName?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, label, labelClassName, ...props }, ref) => {
    const handleClick = () => {
      onCheckedChange?.(!checked);
    };

    return (
      <label className={cn('flex items-center gap-2 cursor-pointer select-none', labelClassName)}>
        <div
          onClick={handleClick}
          className={cn(
            'flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all',
            checked
              ? 'bg-purple-600 border-purple-600'
              : 'bg-gray-900/60 border-gray-600 hover:border-purple-500/70',
            'focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500',
            className
          )}
        >
          {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            className="sr-only"
            {...props}
          />
        </div>
        {label && <span className="text-sm text-gray-300">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
