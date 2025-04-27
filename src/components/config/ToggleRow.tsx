import { Switch } from '@/components/ui/switch';

export default function ToggleRow({
  label,
  desc,
  value,
  onChange,
  className,
  disabled = false,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`toggle-row flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      aria-disabled={disabled}
    >
      <div className="flex flex-col mr-4">
        {' '}
        {/* Ajout de marge à droite pour éviter le chevauchement */}
        <span className={`text-white font-medium ${disabled ? 'text-gray-500' : ''}`}>{label}</span>
        {desc && (
          <span className={`text-xs text-gray-400 mt-1 ${disabled ? 'text-gray-600' : ''}`}>
            {desc}
          </span>
        )}
      </div>
      <Switch
        checked={value}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-purple-600 flex-shrink-0" // Empêche le switch de rétrécir
        disabled={disabled}
      />
    </div>
  );
}
