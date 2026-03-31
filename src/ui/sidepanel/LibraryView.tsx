import { useState, useEffect, useCallback } from 'react';
import { Trash2, FileText, Star } from 'lucide-react';
import { getGuides, softDeleteGuide, toggleStar, getFirstStepUrl } from '@/core/guides/service';
import type { Guide } from '@/core/guides/types';

function formatRelativeTime(timestamp: number): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffMs = timestamp - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffMs / (1000 * 60));
  const diffHour = Math.round(diffMs / (1000 * 60 * 60));
  const diffDay = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
  return rtf.format(diffDay, 'day');
}

function getFaviconUrl(url: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch {
    return '';
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

interface LibraryViewProps {
  onOpen: (guideId: string) => void;
  onStartRecording?: () => void;
  isAlive?: boolean;
  searchQuery?: string;
}

interface GuideWithMeta extends Guide {
  favicon: string;
  domain: string;
}

export default function LibraryView({ onOpen, searchQuery = '' }: LibraryViewProps) {
  const [guides, setGuides] = useState<GuideWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGuides = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getGuides();
      const withMeta: GuideWithMeta[] = await Promise.all(
        result.map(async (guide) => {
          const url = await getFirstStepUrl(guide.id);
          return {
            ...guide,
            favicon: url ? getFaviconUrl(url) : '',
            domain: url ? extractDomain(url) : '',
          };
        })
      );
      setGuides(withMeta);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  const handleStar = useCallback(async (e: React.MouseEvent, guideId: string) => {
    e.stopPropagation();
    await toggleStar(guideId);
    await loadGuides();
  }, [loadGuides]);

  const handleDelete = useCallback(async (e: React.MouseEvent, guideId: string) => {
    e.stopPropagation();
    await softDeleteGuide(guideId);
    await loadGuides();
  }, [loadGuides]);

  const filtered = searchQuery
    ? guides.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : guides;

  if (loading) {
    return <p className="text-sm py-4" style={{ color: '#B5A48B' }}>Loading...</p>;
  }

  if (guides.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: '#FDE68A', border: '1px solid #FBBF24' }}>
          <FileText size={20} style={{ color: '#92400E' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: '#451a03' }}>No guides yet</p>
        <p className="text-xs mt-1" style={{ color: '#B45309' }}>Start a capture to create your first guide</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm" style={{ color: '#B5A48B' }}>No matching guides</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pb-4">
      {filtered.map((guide) => (
        <div
          key={guide.id}
          className="flex items-center gap-3 px-3.5 py-3 rounded-lg cursor-pointer group transition-all"
          style={{ border: '1px solid #FDE68A' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#F59E0B'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(245,158,11,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#FDE68A'; e.currentTarget.style.boxShadow = 'none'; }}
          onClick={() => onOpen(guide.id)}
        >
          {/* Favicon */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden text-xs font-semibold" style={{ background: '#FDE68A', border: '1px solid #FBBF24', color: '#78350F' }}>
            {guide.favicon ? (
              <img
                src={guide.favicon}
                alt=""
                className="w-5 h-5"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = 'none';
                  el.parentElement!.textContent = guide.title.charAt(0).toUpperCase();
                }}
              />
            ) : (
              guide.title.charAt(0).toUpperCase()
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#451a03' }}>{guide.title}</p>
            <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
              {guide.stepIds.length} step{guide.stepIds.length !== 1 ? 's' : ''} &middot; {formatRelativeTime(guide.updatedAt)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
            <button
              onClick={(e) => handleStar(e, guide.id)}
              className={`p-1.5 rounded-lg transition-all ${guide.starred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              style={{ color: guide.starred ? '#F59E0B' : '#D4BFA8' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#F59E0B'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = guide.starred ? '#F59E0B' : '#D4BFA8'; }}
              title={guide.starred ? 'Unstar' : 'Star'}
            >
              <Star size={14} fill={guide.starred ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => handleDelete(e, guide.id)}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              style={{ color: '#D4BFA8' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#D4BFA8'; }}
              title="Move to trash"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
