import { useState, useCallback } from 'react';
import { useRoute } from './router';
import TopNav from './TopNav';
import LibraryContent from './LibraryContent';
import GuideContent from './GuideContent';
import GuideOutline from './GuideOutline';
import type { Step } from '@/core/guides/types';

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
        search={search}
        onSearchChange={setSearch}
      />

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
        <div className="flex-1 flex">
          {/* Step outline panel */}
          <GuideOutline
            steps={guideSteps}
            domain={guideDomain}
            favicon={guideFavicon}
            activeStepId={activeStepId}
            onStepClick={handleStepClick}
          />

          {/* Guide content */}
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-3xl">
              <GuideContent
                guideId={route.guideId}
                onStepsLoaded={handleStepsLoaded}
                scrollToStepId={scrollToStepId}
                onActiveStepChange={setActiveStepId}
                onTitleChange={setGuideTitle}
              />
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
