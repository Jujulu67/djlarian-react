'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';

interface ColorInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const ColorInput: React.FC<ColorInputProps> = ({
  id,
  label,
  value,
  onChange,
  className = '',
  disabled = false,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center space-x-2">
        <Input
          id={id}
          type="color"
          value={value}
          onChange={handleInputChange}
          className={`p-1 h-10 w-14 block bg-transparent border-gray-700 cursor-pointer rounded-lg disabled:opacity-50 disabled:pointer-events-none ${className}`}
          disabled={disabled}
          aria-label={`Select color for ${label}`}
        />
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          className={`flex-grow ${className}`}
          disabled={disabled}
          aria-labelledby={id}
        />
      </div>
    </div>
  );
};

export default ColorInput;
