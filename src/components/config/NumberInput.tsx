import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';

export default function NumberInput({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  desc,
  className,
  disabled = false,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string; // Unité optionnelle à afficher
  desc?: string; // Description optionnelle
  className?: string;
  disabled?: boolean;
}) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = e.target.value === '' ? (min ?? 0) : parseInt(e.target.value, 10); // Gère le cas où le champ est vidé
    if (!isNaN(numValue)) {
      // Optionnel : Clamp la valeur si min/max sont définis
      const clampedValue = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, numValue));
      onChange(clampedValue);
    }
  };

  return (
    <div className={`space-y-2 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <Label htmlFor={id} className={disabled ? 'text-gray-500' : ''}>
        {label}
      </Label>
      <div className="flex items-center space-x-2">
        <Input
          id={id}
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          className={`bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50 ${disabled ? 'cursor-not-allowed' : ''}`}
          aria-describedby={desc ? `${id}-desc` : undefined}
          disabled={disabled}
        />
        {unit && (
          <span className={`text-gray-400 text-sm ${disabled ? 'text-gray-600' : ''}`}>{unit}</span>
        )}
      </div>
      {desc && (
        <p
          id={`${id}-desc`}
          className={`text-xs text-gray-400 mt-1 ${disabled ? 'text-gray-600' : ''}`}
        >
          {desc}
        </p>
      )}
    </div>
  );
}
