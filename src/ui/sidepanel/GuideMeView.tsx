import { ArrowLeft, Check, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browser } from '#imports';
import type { GuideMeSession } from '@/core/guideme/session';
import { SESSION_KEY } from '@/core/guideme/session';
import { getGuide } from '@/core/guides/service';
import type { Guide, Screenshot, Step } from '@/core/guides/types';
import { extractDomain } from '@/lib/utils';

interface GuideMeViewProps {
  guideId: string;
  onExit: () => void;
  onComplete: (guideId: string) => void;
}

interface GuideData {
  guide: Guide;
  steps: Step[];
  screenshots: Map<string, Screenshot>;
}

export default function GuideMeView({ guideId, onExit, onComplete }: GuideMeViewProps) {
  const [data, setData] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [viewedStepIndex, setViewedStepIndex] = useState(0);
  const objectUrlsRef = useRef<Map<string, string>>(new Map());

  const loadGuide = useCallback(async () => {
    const result = await getGuide(guideId);
    if (!result) {
      setLoading(false);
      return;
    }
    setData(result);
    setLoading(false);
  }, [guideId]);

  useEffect(() => {
    loadGuide();
  }, [loadGuide]);

  useEffect(() => {
    const handler = (changes: Record<string, { newValue?: unknown }>) => {
      if (!changes[SESSION_KEY]) return;
      const session = changes[SESSION_KEY].newValue as GuideMeSession | null;
      if (!session) return;
      if (!session.active) {
        onComplete(guideId);
        return;
      }
      setActiveStepIndex(session.activeStepIndex);
      setViewedStepIndex(session.activeStepIndex);
    };

    browser.storage.local.onChanged.addListener(handler);
    return () => browser.storage.local.onChanged.removeListener(handler);
  }, [guideId, onComplete]);

  useEffect(() => {
    browser.storage.local.get([SESSION_KEY]).then((result: Record<string, unknown>) => {
      const session = result[SESSION_KEY] as GuideMeSession | null;
      if (session?.active) {
        setActiveStepIndex(session.activeStepIndex);
        setViewedStepIndex(session.activeStepIndex);
      }
    });
  }, []);

  const getObjectUrl = useCallback((stepId: string, blob: Blob) => {
    const existing = objectUrlsRef.current.get(stepId);
    if (existing) return existing;
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.set(stepId, url);
    return url;
  }, []);

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const viewedStep = data?.steps[viewedStepIndex] ?? null;
  const viewedScreenshot = viewedStep ? data?.screenshots.get(viewedStep.id) : undefined;

  const highlightStyle = useMemo(() => {
    if (!viewedStep?.elementMeta?.rect || !viewedScreenshot?.bounds) return null;
    const rect = viewedStep.elementMeta.rect;
    const bounds = viewedScreenshot.bounds;
    const ratio = viewedStep.elementMeta.devicePixelRatio || 1;

    const imgW = bounds.width;
    const imgH = bounds.height;
    if (!imgW || !imgH) return null;

    const left = ((rect.x * ratio - bounds.x) / imgW) * 100;
    const top = ((rect.y * ratio - bounds.y) / imgH) * 100;
    const width = ((rect.width * ratio) / imgW) * 100;
    const height = ((rect.height * ratio) / imgH) * 100;

    return {
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      height: `${height}%`,
    };
  }, [viewedStep, viewedScreenshot]);

  if (loading) return <p className="text-sm text-warm p-4">Loading...</p>;
  if (!data) return <p className="text-sm text-warm p-4">Guide not found</p>;

  const totalSteps = data.steps.length;

  return (
    <div className="min-h-screen bg-card flex flex-col">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <button onClick={onExit} className="shrink-0 p-1 rounded text-warm hover:text-foreground">
          <ArrowLeft size={18} />
        </button>
        <span className="flex-1 text-sm font-semibold text-foreground truncate">{data.guide.title}</span>
        <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      <div className="px-4 pb-3 flex gap-1">
        {data.steps.map((step, idx) => (
          <div
            key={step.id}
            className={`flex-1 h-[3px] rounded-[1.5px] ${
              idx < activeStepIndex ? 'bg-[#059669]' : idx === activeStepIndex ? 'bg-amber' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div className="px-4 pb-3">
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 pb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-secondary text-amber-800 px-2.5 py-1 rounded-full mb-2.5">
              <span className="w-5 h-5 rounded-full bg-amber text-white flex items-center justify-center text-[10px] font-bold">
                {viewedStepIndex + 1}
              </span>
              Step {viewedStepIndex + 1} of {totalSteps}
            </span>
            <p className="text-[15px] font-semibold text-foreground leading-snug">
              {viewedStep?.description || 'No description'}
            </p>
            {viewedStep?.url && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
                <Globe size={11} />
                {extractDomain(viewedStep.url)}
              </span>
            )}
          </div>

          {viewedScreenshot && (
            <div className="relative mx-4 mb-3 rounded-lg overflow-hidden border border-border">
              <img
                src={getObjectUrl(viewedStep!.id, viewedScreenshot.blob)}
                alt={`Step ${viewedStepIndex + 1}`}
                className="w-full block"
              />
              {highlightStyle && (
                <div className="absolute border-2 border-amber rounded-sm pointer-events-none" style={highlightStyle} />
              )}
            </div>
          )}

          <div className="flex items-center justify-between px-4 pb-3">
            <button
              onClick={() => setViewedStepIndex((i) => Math.max(0, i - 1))}
              disabled={viewedStepIndex === 0}
              className="flex items-center gap-1 text-xs font-medium text-warm hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              onClick={() => setViewedStepIndex((i) => Math.min(totalSteps - 1, i + 1))}
              disabled={viewedStepIndex === totalSteps - 1}
              className="flex items-center gap-1 text-xs font-medium text-warm hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {data.steps.map((step, idx) => {
          const isDone = idx < activeStepIndex;
          const isActive = idx === activeStepIndex;
          return (
            <button
              key={step.id}
              onClick={() => setViewedStepIndex(idx)}
              className={`w-full flex items-start gap-2.5 py-2 px-2 rounded-lg text-left transition-colors ${
                viewedStepIndex === idx ? 'bg-secondary' : 'hover:bg-secondary/50'
              }`}
            >
              {isDone ? (
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#059669] flex items-center justify-center mt-0.5">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </span>
              ) : isActive ? (
                <span className="shrink-0 w-5 h-5 rounded-full bg-amber flex items-center justify-center text-[10px] font-bold text-white mt-0.5">
                  {idx + 1}
                </span>
              ) : (
                <span className="shrink-0 w-5 h-5 rounded-full border-2 border-border flex items-center justify-center text-[10px] font-medium text-muted-foreground mt-0.5">
                  {idx + 1}
                </span>
              )}
              <span
                className={`text-[13px] leading-snug ${
                  isDone
                    ? 'text-muted-foreground'
                    : isActive
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground/60'
                }`}
              >
                {step.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
