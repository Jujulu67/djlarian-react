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
    <div className="absolute -top-4 -right-4 px-3 py-1 rounded-full bg-purple-600 text-white text-sm font-bold">
      {version}
    </div>
  );
}
