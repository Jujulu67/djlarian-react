import { useEffect, useState } from 'react';

export function VersionBadge() {
  const [version, setVersion] = useState('v1.0.0');

  useEffect(() => {
    fetch('/api/plugin/version')
      .then((res) => res.json())
      .then((data) => {
        if (data.version) {
          setVersion(data.version);
        }
      })
      .catch(() => {
        // Keep fallback version
      });
  }, []);

  return (
    <div className="absolute -top-4 -right-4 px-3 py-1 rounded-full bg-purple-600 text-white text-sm font-bold v2:-right-2 v2:-top-3 v2:bg-zinc-950/80 v2:font-semibold v2:ring-1 v2:ring-inset v2:ring-white/15 v2:backdrop-blur-md">
      {version}
    </div>
  );
}
