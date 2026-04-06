import {
  ArrowDownWideNarrow,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type GuideChangeEvent,
  getFirstScreenshot,
  getGuides,
  getStarredGuides,
  getTrashedGuides,
  onGuidesChanged,
  permanentlyDeleteGuide,
  restoreGuide,
  softDeleteGuide,
  toggleStar,
} from '@/core/guides/service';
import type { Guide, Screenshot } from '@/core/guides/types';
import { useFullview } from '@/stores/fullview';
import GuideGridView from './components/GuideGridView';
import GuideListView from './components/GuideListView';

interface LibraryContentProps {
  category: 'all' | 'starred' | 'trash';
}

const emptyMessages: Record<string, string> = {
  all: 'No guides yet. Start a capture from the Mimik extension.',
  starred: 'No starred guides. Star a guide to find it quickly.',
  trash: 'Trash is empty.',
};

type SortKey = 'recent' | 'oldest' | 'alpha' | 'steps';
const sortLabels: Record<SortKey, string> = {
  recent: 'Recent first',
  oldest: 'Oldest first',
  alpha: 'A — Z',
  steps: 'Most steps',
};

const PAGE_SIZE = 9;

function sortGuides(guides: Guide[], sort: SortKey): Guide[] {
  const sorted = [...guides];
  switch (sort) {
    case 'recent':
      return sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    case 'oldest':
      return sorted.sort((a, b) => a.updatedAt - b.updatedAt);
    case 'alpha':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'steps':
      return sorted.sort((a, b) => b.stepIds.length - a.stepIds.length);
  }
}

export default function LibraryContent({ category }: LibraryContentProps) {
  const {
    setGuides,
    updateGuide,
    setThumbnails,
    libraryLoading: loading,
    setLibraryLoading: setLoading,
    setCounts,
  } = useFullview((s) => ({
    setGuides: s.setGuides,
    updateGuide: s.updateGuide,
    setThumbnails: s.setThumbnails,
    libraryLoading: s.libraryLoading,
    setLibraryLoading: s.setLibraryLoading,
    setCounts: s.setCounts,
  }));

  const [display, setDisplay] = useState<'list' | 'grid'>(
    () => (localStorage.getItem('mimik-display') as 'list' | 'grid') || 'grid',
  );
  const [sort, setSort] = useState<SortKey>('recent');
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(0);
  const sortRef = useRef<HTMLDivElement>(null);

  const allGuidesRef = useRef<Guide[]>([]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const refreshCounts = useCallback(async () => {
    const [all, starred, trashed] = await Promise.all([getGuides(), getStarredGuides(), getTrashedGuides()]);
    setCounts({ all: all.length, starred: starred.length, trash: trashed.length });
  }, [setCounts]);

  const loadGuides = useCallback(async () => {
    setLoading(true);
    const [all, starred, trashed] = await Promise.all([getGuides(), getStarredGuides(), getTrashedGuides()]);
    setCounts({ all: all.length, starred: starred.length, trash: trashed.length });

    const current = category === 'starred' ? starred : category === 'trash' ? trashed : all;
    allGuidesRef.current = current;

    const sorted = sortGuides(current, sort);
    const paged = sorted.slice(0, PAGE_SIZE);
    setGuides(paged);
    setPage(0);

    const thumbMap = new Map<string, Screenshot>();
    for (const guide of current.slice(0, 20)) {
      const screenshot = await getFirstScreenshot(guide.id);
      if (screenshot) thumbMap.set(guide.id, screenshot);
    }
    setThumbnails(thumbMap);
    setLoading(false);
  }, [category, sort, setCounts, setGuides, setThumbnails, setLoading]);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  useEffect(
    () =>
      onGuidesChanged((event: GuideChangeEvent) => {
        if (event.type === 'starred') {
          updateGuide(event.id, { starred: event.starred });
          refreshCounts();
        } else {
          loadGuides();
        }
      }),
    [refreshCounts, loadGuides, updateGuide],
  );

  const totalPages = Math.ceil(allGuidesRef.current.length / PAGE_SIZE);

  const applyPage = useCallback(
    async (newPage: number) => {
      const sorted = sortGuides(allGuidesRef.current, sort);
      const start = newPage * PAGE_SIZE;
      const paged = sorted.slice(start, start + PAGE_SIZE);
      setGuides(paged);
      setPage(newPage);

      const thumbMap = new Map<string, Screenshot>();
      for (const guide of paged) {
        const screenshot = await getFirstScreenshot(guide.id);
        if (screenshot) thumbMap.set(guide.id, screenshot);
      }
      setThumbnails(thumbMap);
    },
    [sort, setGuides, setThumbnails],
  );

  const handleSort = (key: SortKey) => {
    setSort(key);
    setSortOpen(false);
    const sorted = sortGuides(allGuidesRef.current, key);
    setGuides(sorted.slice(0, PAGE_SIZE));
    setPage(0);
  };

  const toggleDisplay = () => {
    const next = display === 'list' ? 'grid' : 'list';
    setDisplay(next);
    localStorage.setItem('mimik-display', next);
  };

  const handleStar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const guide = allGuidesRef.current.find((g) => g.id === id);
    if (guide) updateGuide(id, { starred: !guide.starred });
    await toggleStar(id);
    await refreshCounts();
  };
  const handleTrash = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await softDeleteGuide(id);
    await loadGuides();
  };
  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await restoreGuide(id);
    await loadGuides();
  };
  const handlePermanentDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Permanently delete this guide? This cannot be undone.')) return;
    await permanentlyDeleteGuide(id);
    await loadGuides();
  };

  const showPagination = !loading && allGuidesRef.current.length > PAGE_SIZE;

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-4">
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-3 py-1.5 rounded-lg border border-border bg-card hover:border-violet hover:text-purple transition-colors"
          >
            <ArrowDownWideNarrow size={13} />
            {sortLabels[sort]}
            <ChevronDown size={10} className="ml-0.5" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`w-full text-left text-xs font-medium px-3 py-2 transition-colors ${
                    sort === key
                      ? 'text-foreground bg-secondary'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  }`}
                >
                  {sortLabels[key]}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={toggleDisplay}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:border-violet hover:text-purple transition-colors"
          title={display === 'list' ? 'Grid view' : 'List view'}
        >
          {display === 'list' ? <LayoutGrid size={15} /> : <LayoutList size={15} />}
        </button>
      </div>

      {loading ? (
        <p className="text-sm py-12 text-center text-purple">Loading...</p>
      ) : allGuidesRef.current.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="mx-auto mb-3 text-border" />
          <p className="text-lg text-muted-foreground">{emptyMessages[category]}</p>
        </div>
      ) : display === 'list' ? (
        <GuideListView
          category={category}
          onStar={handleStar}
          onTrash={handleTrash}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
        />
      ) : (
        <GuideGridView />
      )}

      {showPagination && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => applyPage(page - 1)}
            disabled={page === 0}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:border-violet hover:text-purple transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs font-medium text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => applyPage(page + 1)}
            disabled={page >= totalPages - 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:border-violet hover:text-purple transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
