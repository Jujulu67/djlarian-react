import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ options, className = '', ...props }) => {
  return (
    <div className="relative group">
      <select
        className={cn(
          'block w-full appearance-none rounded-lg border text-sm transition-all duration-200 ease-in-out',
          'px-4 py-2.5 pr-10',
          'bg-gray-800/80 text-gray-100 border-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500',
          'hover:bg-gray-800 hover:border-gray-600',
          'disabled:opacity-50 disabled:pointer-events-none',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 transition-colors group-hover:text-gray-200">
        <ChevronDown className="h-4 w-4 opacity-80 transition-transform duration-200 ease-in-out group-focus-within:rotate-180" />
      </div>
    </div>
  );
};
