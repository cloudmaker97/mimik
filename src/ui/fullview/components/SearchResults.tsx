import type { Guide } from '@/core/guides/types';
import { formatDateShort } from '@/lib/utils';

interface GuideResult {
  guide: Guide;
  favicon: string;
}

interface SearchResultsProps {
  results: GuideResult[];
  query: string;
  selected: number;
  onSelect: (guideId: string) => void;
  onHover: (index: number) => void;
}

export default function SearchResults({ results, query, selected, onSelect, onHover }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-purple">{query ? 'No matching guides' : 'No guides yet'}</p>
      </div>
    );
  }

  return (
    <>
      {results.map((r, i) => (
        <div
          key={r.guide.id}
          className="flex items-center gap-3 cursor-pointer transition-colors"
          style={
            i === selected
              ? { background: 'var(--color-primary)', borderRadius: '8px', margin: '0 6px', padding: '10px 12px' }
              : { padding: '10px 16px' }
          }
          onClick={() => onSelect(r.guide.id)}
          onMouseEnter={() => onHover(i)}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold shrink-0 overflow-hidden"
            style={
              i === selected
                ? {
                    background: 'rgba(199,210,254,0.15)',
                    border: '1px solid rgba(199,210,254,0.2)',
                    color: 'var(--color-gold)',
                  }
                : {
                    background: 'var(--color-secondary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-muted-foreground)',
                  }
            }
          >
            {r.favicon ? (
              <img
                src={r.favicon}
                alt=""
                className="w-3.5 h-3.5"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              r.guide.title.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-medium truncate"
              style={{ color: i === selected ? 'var(--color-gold)' : 'var(--color-foreground)' }}
            >
              {r.guide.title}
            </p>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: i === selected ? 'rgba(199,210,254,0.6)' : 'var(--color-warm)' }}
            >
              {r.guide.stepIds.length} step{r.guide.stepIds.length !== 1 ? 's' : ''} ·{' '}
              {formatDateShort(r.guide.updatedAt)}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}
