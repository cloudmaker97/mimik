import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteStep,
  getGuide,
  onGuidesChanged,
  updateGuideTitle,
  updateScreenshotBlob,
  updateStepDescription,
} from '@/core/guides/service';
import type { Guide, Screenshot, Step } from '@/core/guides/types';
import { getFaviconUrl, getMostCommonDomain } from '@/lib/utils';
import { useFullviewStore } from '@/stores/fullview';
import BlurCanvas from '@/ui/sidepanel/BlurCanvas';
import GuideStepList from './components/GuideStepList';

function useTypewriter(text: string, enabled: boolean, speed = 40): { display: string; done: boolean } {
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (enabled && text !== prevTextRef.current && prevTextRef.current === 'Untitled Guide') {
      prevTextRef.current = text;
      setIndex(0);
      setActive(true);
    } else {
      prevTextRef.current = text;
    }
  }, [text, enabled]);

  useEffect(() => {
    if (!active || index >= text.length) {
      if (index >= text.length) setActive(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), speed);
    return () => clearTimeout(timer);
  }, [active, index, text, speed]);

  return { display: active ? text.slice(0, index) : text, done: !active };
}

interface GuideContentProps {
  guideId: string;
}

interface GuideData {
  guide: Guide;
  steps: Step[];
  screenshots: Map<string, Screenshot>;
}

export default function GuideContent({ guideId }: GuideContentProps) {
  const setGuideTitle = useFullviewStore((s) => s.setGuideTitle);
  const setGuideStepCount = useFullviewStore((s) => s.setGuideStepCount);
  const setGuideExportData = useFullviewStore((s) => s.setGuideExportData);

  const [data, setData] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [blurringStepId, setBlurringStepId] = useState<string | null>(null);
  const hasSteps = data ? data.steps.length > 0 : false;
  const typewriter = useTypewriter(title, hasSteps);

  const loadGuide = useCallback(async () => {
    const result = await getGuide(guideId);
    if (result) {
      setData(result);
      setTitle(result.guide.title);
      document.title = `${result.guide.title} — Mimik`;
      setGuideTitle(result.guide.title);
      setGuideStepCount(result.steps.length);
      setGuideExportData({ guideId, ...result });
    }
    setLoading(false);
  }, [guideId, setGuideTitle, setGuideStepCount, setGuideExportData]);

  useEffect(() => {
    loadGuide();
    return onGuidesChanged(() => loadGuide());
  }, [loadGuide]);

  const handleTitleBlur = useCallback(async () => {
    if (!data || title === data.guide.title) return;
    await updateGuideTitle(guideId, title);
    setData((prev) => (prev ? { ...prev, guide: { ...prev.guide, title } } : prev));
    document.title = `${title} — Mimik`;
  }, [data, guideId, title]);

  const handleDescriptionChange = useCallback(async (stepId: string, description: string) => {
    await updateStepDescription(stepId, description);
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.map((s) => (s.id === stepId ? { ...s, description } : s)) };
    });
  }, []);

  const handleDeleteStep = useCallback(
    async (stepId: string) => {
      await deleteStep(guideId, stepId);
      await loadGuide();
    },
    [guideId, loadGuide],
  );

  const handleBlurSave = useCallback(
    async (blob: Blob) => {
      if (!blurringStepId || !data) return;
      const screenshot = data.screenshots.get(blurringStepId);
      if (!screenshot) return;
      await updateScreenshotBlob(screenshot.id, blob);
      setData((prev) => {
        if (!prev) return prev;
        const newScreenshots = new Map(prev.screenshots);
        newScreenshots.set(blurringStepId, { ...screenshot, blob });
        return { ...prev, screenshots: newScreenshots };
      });
      setBlurringStepId(null);
    },
    [blurringStepId, data],
  );

  if (loading)
    return (
      <div>
        <div className="h-10 w-2/3 rounded-lg bg-border/50 animate-pulse" />
        <div className="h-4 w-48 rounded bg-border/30 animate-pulse mt-3 mb-8" />
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 p-4">
              <div
                className="aspect-video rounded-lg bg-[#f5f2ee] animate-pulse mb-3"
                style={{ animationDelay: `${i * 150}ms` }}
              />
              <div
                className="h-4 w-3/4 rounded bg-border/40 animate-pulse"
                style={{ animationDelay: `${i * 150 + 50}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  if (!data) return <p className="text-sm py-12 text-center text-warm">Guide not found.</p>;

  const domain = getMostCommonDomain(data.steps);
  const blurScreenshot = blurringStepId ? data.screenshots.get(blurringStepId) : undefined;

  return (
    <div>
      {blurringStepId && blurScreenshot && (
        <BlurCanvas screenshot={blurScreenshot} onSave={handleBlurSave} onCancel={() => setBlurringStepId(null)} />
      )}

      {title === 'Untitled Guide' && data.steps.length > 0 ? (
        <div className="text-[32px] font-extrabold animate-gradient-text bg-[length:300%_100%] bg-clip-text text-transparent bg-gradient-to-r from-muted-foreground via-amber to-muted-foreground">
          Generating title...
        </div>
      ) : !typewriter.done ? (
        <div className="text-[32px] font-extrabold text-foreground">
          {typewriter.display}
          <span className="inline-block w-[3px] h-[30px] bg-amber ml-0.5 align-text-bottom animate-blink" />
        </div>
      ) : (
        <textarea
          ref={(el) => {
            if (el) {
              el.style.height = '0';
              el.style.height = `${el.scrollHeight}px`;
            }
          }}
          value={title}
          rows={1}
          onChange={(e) => {
            setTitle(e.target.value);
            setGuideTitle(e.target.value);
            const el = e.target;
            el.style.height = '0';
            el.style.height = `${el.scrollHeight}px`;
          }}
          onBlur={handleTitleBlur}
          className="text-[32px] font-extrabold bg-transparent border-b-2 border-transparent hover:border-border focus:outline-none focus:border-accent w-full p-0 text-foreground resize-none leading-tight overflow-hidden"
        />
      )}

      <div className="flex items-center gap-1.5 mt-2 mb-4 flex-wrap">
        <span className="inline-flex items-center text-[11px] font-medium text-muted-foreground bg-white border border-border px-2.5 py-0.5 rounded-full">
          {new Date(data.guide.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <span className="inline-flex items-center text-[11px] font-medium text-muted-foreground bg-white border border-border px-2.5 py-0.5 rounded-full">
          {data.steps.length} step{data.steps.length !== 1 ? 's' : ''}
        </span>
        {domain && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-white border border-border pl-1.5 pr-2.5 py-0.5 rounded-full">
            <img
              src={getFaviconUrl(domain, 16)}
              alt=""
              className="w-3.5 h-3.5 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {domain}
          </span>
        )}
      </div>

      <GuideStepList
        guideId={guideId}
        steps={data.steps}
        screenshots={data.screenshots}
        onDescriptionChange={handleDescriptionChange}
        onDelete={handleDeleteStep}
        onBlur={(stepId) => setBlurringStepId(stepId)}
        onReorder={(newSteps) => setData((prev) => (prev ? { ...prev, steps: newSteps } : prev))}
      />
    </div>
  );
}
