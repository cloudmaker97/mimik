import { useState, useEffect, useCallback, useRef } from 'react';
import { getGuide, updateGuideTitle, updateStepDescription, deleteStep, reorderSteps, updateScreenshotBlob } from '@/core/guides/service';
import type { Guide, Step, Screenshot } from '@/core/guides/types';
import StepCard from '@/ui/sidepanel/StepCard';
import BlurCanvas from '@/ui/sidepanel/BlurCanvas';

interface GuideContentProps {
  guideId: string;
  onStepsLoaded: (steps: Step[], domain: string, favicon: string) => void;
  scrollToStepId: string | null;
  onActiveStepChange: (stepId: string | null) => void;
  onTitleChange?: (title: string) => void;
  onGuideDataLoaded?: (data: { guideId: string; guide: Guide; steps: Step[]; screenshots: Map<string, Screenshot> }) => void;
}

interface GuideData {
  guide: Guide;
  steps: Step[];
  screenshots: Map<string, Screenshot>;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}
function getFaviconUrl(url: string): string {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; } catch { return ''; }
}

export default function GuideContent({ guideId, onStepsLoaded, scrollToStepId, onActiveStepChange, onTitleChange, onGuideDataLoaded }: GuideContentProps) {
  const [data, setData] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [blurringStepId, setBlurringStepId] = useState<string | null>(null);
  const stepRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const loadGuide = useCallback(async () => {
    const result = await getGuide(guideId);
    if (result) {
      setData(result);
      setTitle(result.guide.title);
      document.title = `${result.guide.title} — Mimik`;
      onTitleChange?.(result.guide.title);
      onGuideDataLoaded?.({ guideId, guide: result.guide, steps: result.steps, screenshots: result.screenshots });
      const firstUrl = result.steps[0]?.url || '';
      onStepsLoaded(result.steps, extractDomain(firstUrl), getFaviconUrl(firstUrl));
    }
    setLoading(false);
  }, [guideId, onStepsLoaded, onTitleChange]);

  useEffect(() => { loadGuide(); }, [loadGuide]);

  useEffect(() => {
    if (scrollToStepId) {
      const el = stepRefs.current.get(scrollToStepId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [scrollToStepId]);

  useEffect(() => {
    if (!data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onActiveStepChange(entry.target.getAttribute('data-step-id'));
          }
        }
      },
      { threshold: 0.5 }
    );
    stepRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [data, onActiveStepChange]);

  const handleTitleBlur = useCallback(async () => {
    if (!data || title === data.guide.title) return;
    await updateGuideTitle(guideId, title);
    setData(prev => prev ? { ...prev, guide: { ...prev.guide, title } } : prev);
    document.title = `${title} — Mimik`;
  }, [data, guideId, title]);

  const handleDescriptionChange = useCallback(async (stepId: string, description: string) => {
    await updateStepDescription(stepId, description);
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.map(s => s.id === stepId ? { ...s, description } : s) };
    });
  }, []);

  const handleDeleteStep = useCallback(async (stepId: string) => {
    await deleteStep(guideId, stepId);
    await loadGuide();
  }, [guideId, loadGuide]);

  const handleBlurSave = useCallback(async (blob: Blob) => {
    if (!blurringStepId || !data) return;
    const blurScreenshot = data.screenshots.get(blurringStepId);
    if (!blurScreenshot) return;
    await updateScreenshotBlob(blurScreenshot.id, blob);
    setData(prev => {
      if (!prev) return prev;
      const newScreenshots = new Map(prev.screenshots);
      newScreenshots.set(blurringStepId, { ...blurScreenshot, blob });
      return { ...prev, screenshots: newScreenshots };
    });
    setBlurringStepId(null);
  }, [blurringStepId, data]);

  if (loading) return <p className="text-sm text-gray-400 py-12 text-center">Loading...</p>;
  if (!data) return <p className="text-sm text-red-500 py-12 text-center">Guide not found.</p>;

  const blurScreenshot = blurringStepId ? data.screenshots.get(blurringStepId) : undefined;
  const siteUrl = data.steps[0]?.url || '';
  const domain = extractDomain(siteUrl);
  const favicon = getFaviconUrl(siteUrl);

  return (
    <div>
      {blurringStepId && blurScreenshot && (
        <BlurCanvas screenshot={blurScreenshot} onSave={handleBlurSave} onCancel={() => setBlurringStepId(null)} />
      )}

      {/* Title */}
      <input
        className="text-[32px] font-extrabold bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:outline-none w-full"
        style={{ color: '#451a03' }}
        value={title}
        onChange={(e) => { setTitle(e.target.value); onTitleChange?.(e.target.value); }}
        onBlur={handleTitleBlur}
        onFocus={(e) => { e.target.style.borderColor = '#F59E0B'; }}
        onBlurCapture={(e) => { e.target.style.borderColor = 'transparent'; }}
      />

      {/* Meta */}
      <p className="text-xs mt-1 mb-8" style={{ color: '#92400E' }}>
        Created {new Date(data.guide.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {data.steps.length} step{data.steps.length !== 1 ? 's' : ''}{domain ? ` · ${domain}` : ''}
      </p>

      {/* Steps */}
      {data.steps.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">No steps in this guide.</p>
      ) : (
        <div className="space-y-6">
          {data.steps.map((step, idx) => (
            <div
              key={step.id}
              ref={(el) => { if (el) stepRefs.current.set(step.id, el); else stepRefs.current.delete(step.id); }}
              data-step-id={step.id}
            >
              {dragOverIndex === idx && dragIndex !== null && dragIndex !== idx && (
                <div className="h-1 bg-amber-500 rounded-full mx-4 mb-2" />
              )}
              <StepCard
                step={step}
                screenshot={data.screenshots.get(step.id)}
                onDescriptionChange={handleDescriptionChange}
                onDelete={handleDeleteStep}
                onBlur={(stepId) => setBlurringStepId(stepId)}
                dragHandleProps={{
                  onDragStart: (e: React.DragEvent) => { setDragIndex(idx); e.dataTransfer.effectAllowed = 'move'; },
                  onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOverIndex(idx); },
                  onDragEnd: () => {
                    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
                      setData(prev => {
                        if (!prev) return prev;
                        const newSteps = [...prev.steps];
                        const [moved] = newSteps.splice(dragIndex, 1);
                        newSteps.splice(dragOverIndex, 0, moved);
                        reorderSteps(guideId, newSteps.map(s => s.id));
                        return { ...prev, steps: newSteps };
                      });
                    }
                    setDragIndex(null);
                    setDragOverIndex(null);
                  },
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
