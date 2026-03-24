import { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, LayoutList, Star, Trash2, RotateCcw, Search, FileText } from 'lucide-react';
import { getGuides, getStarredGuides, getTrashedGuides, softDeleteGuide, permanentlyDeleteGuide, restoreGuide, toggleStar, getFirstScreenshot } from '../shared/guide-service';
import type { Guide, Screenshot } from '../shared/types';
import { navigate } from './router';
import ZoomScreenshot from '../sidepanel/ZoomScreenshot';

interface LibraryContentProps {
  category: 'all' | 'starred' | 'trash';
  onCountsChange: (counts: { all: number; starred: number; trash: number }) => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LibraryContent({ category, onCountsChange }: LibraryContentProps) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [thumbnails, setThumbnails] = useState<Map<string, Screenshot>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [display, setDisplay] = useState<'list' | 'grid'>(() =>
    (localStorage.getItem('mimik-display') as 'list' | 'grid') || 'list'
  );

  const loadGuides = useCallback(async () => {
    setLoading(true);
    const [all, starred, trashed] = await Promise.all([
      getGuides(), getStarredGuides(), getTrashedGuides(),
    ]);
    onCountsChange({ all: all.length, starred: starred.length, trash: trashed.length });

    const current = category === 'starred' ? starred : category === 'trash' ? trashed : all;
    setGuides(current);

    const thumbMap = new Map<string, Screenshot>();
    for (const guide of current.slice(0, 20)) {
      const screenshot = await getFirstScreenshot(guide.id);
      if (screenshot) thumbMap.set(guide.id, screenshot);
    }
    setThumbnails(thumbMap);
    setLoading(false);
  }, [category, onCountsChange]);

  useEffect(() => { loadGuides(); }, [loadGuides]);

  const toggleDisplay = () => {
    const next = display === 'list' ? 'grid' : 'list';
    setDisplay(next);
    localStorage.setItem('mimik-display', next);
  };

  const filtered = search
    ? guides.filter(g => g.title.toLowerCase().includes(search.toLowerCase()))
    : guides;

  const handleStar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await toggleStar(id);
    await loadGuides();
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

  const titles: Record<string, string> = { all: 'All Guides', starred: 'Starred', trash: 'Trash' };
  const emptyMessages: Record<string, string> = {
    all: 'No guides yet. Start a capture from the Mimik extension.',
    starred: 'No starred guides. Star a guide to find it quickly.',
    trash: 'Trash is empty.',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{titles[category]}</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search guides..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 w-56"
            />
          </div>
          <button
            onClick={toggleDisplay}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            title={display === 'list' ? 'Grid view' : 'List view'}
          >
            {display === 'list' ? <LayoutGrid size={16} /> : <LayoutList size={16} />}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-lg text-gray-500">{search ? 'No matching guides' : emptyMessages[category]}</p>
        </div>
      ) : display === 'list' ? (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          {filtered.map((guide, idx) => (
            <div
              key={guide.id}
              onClick={() => navigate({ page: 'guide', guideId: guide.id })}
              className={`flex items-center px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors group ${
                idx < filtered.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{guide.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {guide.stepIds.length} step{guide.stepIds.length !== 1 ? 's' : ''} &middot; {formatDate(guide.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {category !== 'trash' ? (
                  <>
                    <button onClick={(e) => handleStar(e, guide.id)}
                      className={`p-1.5 rounded-lg hover:bg-gray-100 ${guide.starred ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
                      title={guide.starred ? 'Unstar' : 'Star'}>
                      <Star size={14} fill={guide.starred ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={(e) => handleTrash(e, guide.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50"
                      title="Move to trash">
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={(e) => handleRestore(e, guide.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50"
                      title="Restore">
                      <RotateCcw size={14} />
                    </button>
                    <button onClick={(e) => handlePermanentDelete(e, guide.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50"
                      title="Delete permanently">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(guide => {
            const thumb = thumbnails.get(guide.id);
            return (
              <div
                key={guide.id}
                onClick={() => navigate({ page: 'guide', guideId: guide.id })}
                className="border border-gray-200 rounded-xl bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="h-36 bg-gray-100 overflow-hidden">
                  {thumb ? (
                    <ZoomScreenshot screenshot={thumb} alt={guide.title} className="!rounded-none !border-0" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <FileText size={32} />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{guide.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {guide.stepIds.length} step{guide.stepIds.length !== 1 ? 's' : ''} &middot; {formatDate(guide.updatedAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
