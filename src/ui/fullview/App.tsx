import { useState, useCallback, useEffect } from 'react';
import { useRoute } from './router';
import TopNav from './TopNav';
import LibraryContent from './LibraryContent';
import GuideContent from './GuideContent';
import SearchModal from './SearchModal';
import type { Step, Guide, Screenshot } from '@/core/guides/types';

export default function FullViewApp() {
  const route = useRoute();
  const [counts, setCounts] = useState({ all: 0, starred: 0, trash: 0 });
  const [search, setSearch] = useState('');

  const [guideSteps, setGuideSteps] = useState<Step[]>([]);
  const [guideDomain, setGuideDomain] = useState('');
  const [guideFavicon, setGuideFavicon] = useState('');
  const [guideTitle, setGuideTitle] = useState('');
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [scrollToStepId, setScrollToStepId] = useState<string | null>(null);
  const [guideExportData, setGuideExportData] = useState<{ guideId: string; guide: Guide; steps: Step[]; screenshots: Map<string, Screenshot> } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleStepsLoaded = useCallback((steps: Step[], domain: string, favicon: string) => {
    setGuideSteps(steps);
    setGuideDomain(domain);
    setGuideFavicon(favicon);
  }, []);

  const handleStepClick = useCallback((stepId: string) => {
    setScrollToStepId(stepId);
    setTimeout(() => setScrollToStepId(null), 100);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF8' }}>
      <TopNav
        route={route}
        guideCounts={counts}
        guideTitle={route.page === 'guide' ? guideTitle : undefined}
        guideData={route.page === 'guide' ? guideExportData ?? undefined : undefined}
        search={search}
        onSearchChange={setSearch}
        onSearchClick={() => setSearchOpen(true)}
      />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {route.page === 'library' && (
        <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
          <LibraryContent
            category={route.category}
            onCountsChange={setCounts}
            searchQuery={search}
          />
        </main>
      )}

      {route.page === 'guide' && (
        <main className="flex-1 py-10 px-6">
          <div className="max-w-[720px] mx-auto">
            <GuideContent
              guideId={route.guideId}
              onStepsLoaded={handleStepsLoaded}
              scrollToStepId={scrollToStepId}
              onActiveStepChange={setActiveStepId}
              onTitleChange={setGuideTitle}
              onGuideDataLoaded={setGuideExportData}
            />
          </div>
        </main>
      )}
    </div>
  );
}
