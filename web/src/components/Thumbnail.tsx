import { FileVideo } from 'lucide-react';
import { useState } from 'react';
import { platformVisual } from '../lib/platform';

export function Thumbnail({
  src,
  platform,
  className = 'h-12 w-20',
}: {
  src: string | null;
  platform: string;
  className?: string;
}) {
  const [error, setError] = useState(false);
  const visual = platformVisual(platform);

  if (!src || error) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 ${className}`}
        style={{ color: visual.color }}
      >
        <FileVideo className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setError(true)}
      className={`shrink-0 rounded-lg object-cover ${className}`}
    />
  );
}
