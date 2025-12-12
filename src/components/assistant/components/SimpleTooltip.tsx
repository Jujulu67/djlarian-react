'use client';

/**
 * Tooltip simple et rapide
 */
export function SimpleTooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group/tooltip relative flex items-center min-w-0">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-50 whitespace-nowrap px-2 py-1 bg-gray-900/95 backdrop-blur border border-white/10 rounded text-[10px] text-white shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
      </div>
    </div>
  );
}
