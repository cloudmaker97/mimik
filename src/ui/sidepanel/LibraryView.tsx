import { FileText, Star, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  type GuideChangeEvent,
  getGuideDomain,
  getGuides,
  onGuidesChanged,
  softDeleteGuide,
  toggleStar,
} from '@/core/guides/service';
import type { Guide } from '@/core/guides/types';
import { formatRelativeTime, getFaviconUrl } from '@/lib/utils';

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
          const domain = await getGuideDomain(guide.id);
          return {
            ...guide,
            favicon: domain ? getFaviconUrl(domain) : '',
            domain,
          };
        }),
      );
      setGuides(withMeta);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  useEffect(
    () =>
      onGuidesChanged((event: GuideChangeEvent) => {
        if (event.type === 'starred') {
          setGuides((prev) => prev.map((g) => (g.id === event.id ? { ...g, starred: event.starred } : g)));
        } else {
          loadGuides();
        }
      }),
    [loadGuides],
  );

  const handleStar = useCallback(async (e: React.MouseEvent, guideId: string) => {
    e.stopPropagation();
    setGuides((prev) => prev.map((g) => (g.id === guideId ? { ...g, starred: !g.starred } : g)));
    await toggleStar(guideId);
  }, []);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, guideId: string) => {
      e.stopPropagation();
      await softDeleteGuide(guideId);
      await loadGuides();
    },
    [loadGuides],
  );

  const filtered = searchQuery
    ? guides.filter((g) => g.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : guides;

  if (loading) {
    return <p className="text-sm py-4 text-purple">Loading...</p>;
  }

  if (guides.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 bg-lavender border border-violet-light">
          <FileText size={20} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No guides yet</p>
        <p className="text-xs mt-1 text-purple">Start a capture to create your first guide</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-purple">No matching guides</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-1 pb-4">
      {filtered.map((guide) => {
        const isEmpty = guide.stepIds.length === 0;
        return (
          <div
            key={guide.id}
            className="flex items-start gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer group transition-all bg-card border border-border hover:border-violet hover:shadow-sm"
            onClick={() => onOpen(guide.id)}
          >
            <div className="w-7 h-7 mt-0.5 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
              {guide.favicon ? (
                <img
                  src={guide.favicon}
                  alt=""
                  className="w-5 h-5"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-full border-[1.5px] border-dashed border-border" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-medium truncate ${isEmpty ? 'text-[#8B92A8]' : 'text-foreground'}`}>
                {guide.title}
              </p>
              <p className="text-[10px] mt-0.5 text-[#8B92A8]">{formatRelativeTime(guide.updatedAt)}</p>
            </div>

            {guide.stepIds.length > 0 && (
              <span className="text-[9px] font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-full shrink-0 leading-none mt-0.5">
                {guide.stepIds.length} step{guide.stepIds.length !== 1 ? 's' : ''}
              </span>
            )}

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={(e) => handleStar(e, guide.id)}
                className={`p-1.5 rounded-lg transition-all hover:text-accent ${guide.starred ? 'text-accent' : 'text-border'}`}
                title={guide.starred ? 'Unstar' : 'Star'}
              >
                <Star size={13} fill={guide.starred ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={(e) => handleDelete(e, guide.id)}
                className="p-1.5 rounded-lg transition-all text-border hover:text-red-500"
                title="Move to trash"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
