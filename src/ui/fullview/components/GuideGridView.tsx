import { formatDate } from '@/lib/utils';
import { useFullview } from '@/stores/fullview';
import ZoomScreenshot from '@/ui/sidepanel/ZoomScreenshot';
import { navigate } from '../router';

function MimikEyes() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-primary">
      <svg width="120" height="50" viewBox="0 0 120 50" fill="none">
        <path d="M15 30 Q27 14 39 30" stroke="#DDD6FE" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M81 30 Q93 14 105 30" stroke="#DDD6FE" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M39 44 Q60 54 81 44" stroke="#DDD6FE" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

export default function GuideGridView() {
  const { guides, thumbnails } = useFullview((s) => ({
    guides: s.guides,
    thumbnails: s.thumbnails,
  }));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {guides.map((guide) => {
        const thumb = thumbnails.get(guide.id);
        return (
          <div
            key={guide.id}
            onClick={() => navigate({ page: 'guide', guideId: guide.id })}
            className="rounded-xl bg-card overflow-hidden cursor-pointer hover:shadow-md transition-shadow border border-border"
          >
            <div className="h-36 overflow-hidden">
              {thumb ? (
                <ZoomScreenshot screenshot={thumb} alt={guide.title} className="!rounded-none !border-0" />
              ) : (
                <MimikEyes />
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium truncate text-foreground">{guide.title}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">
                {guide.stepIds.length} step{guide.stepIds.length !== 1 ? 's' : ''} &middot;{' '}
                {formatDate(guide.updatedAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
