import { useState, useEffect, useCallback } from 'react';
import { Trash2, FileText } from 'lucide-react';
import { getGuides, softDeleteGuide } from '../shared/guide-service';
import type { Guide } from '../shared/types';

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

interface LibraryViewProps {
  onOpen: (guideId: string) => void;
  onStartRecording?: () => void;
  isAlive?: boolean;
}

export default function LibraryView({ onOpen, onStartRecording, isAlive }: LibraryViewProps) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGuides = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getGuides();
      setGuides(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  const handleDelete = useCallback(async (e: React.MouseEvent, guideId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this guide?')) return;
    await softDeleteGuide(guideId);
    await loadGuides();
  }, [loadGuides]);

  if (loading) {
    return <p className="text-sm text-gray-400 px-5 py-4">Loading...</p>;
  }

  if (guides.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <FileText size={20} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No guides yet</p>
        <p className="text-xs text-gray-400 mt-1">Start a capture to create your first guide</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y divide-gray-50">
        {guides.map((guide) => (
          <div
            key={guide.id}
            className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between group transition-colors"
            onClick={() => onOpen(guide.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{guide.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {guide.stepIds.length} step{guide.stepIds.length !== 1 ? 's' : ''} &middot; {formatRelativeTime(guide.updatedAt)}
              </p>
            </div>
            <button
              onClick={(e) => handleDelete(e, guide.id)}
              className="ml-2 p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
              title="Delete guide"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
