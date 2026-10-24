'use client';

export function PayoutRow({
  symbol,
  name,
  x3,
  x2,
  isRare,
}: {
  symbol: string;
  name: string;
  x3: number;
  x2: number;
  isRare?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_1fr_1fr] gap-2 items-center py-1 ${isRare ? 'text-yellow-200' : 'text-slate-300'}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{symbol}</span>
      </div>
      <div className="text-center font-bold text-yellow-500">{x3}</div>
      <div className="text-right font-medium text-slate-400">{x2}</div>
    </div>
  );
}
