import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Trash2, Square } from 'lucide-react';
import { getActiveTab } from '@/lib/browser-api';
import { db } from '@/guides/db';
import type { Step, Screenshot } from '@/guides/types';
import ZoomScreenshot from './ZoomScreenshot';

interface RecordingViewProps {
  guideId: string;
  onStop: () => void;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function getFaviconUrl(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return '';
  }
}

interface LiveStep {
  step: Step;
  screenshot?: Screenshot;
  objectUrl?: string;
}

export default function RecordingView({ guideId, onStop }: RecordingViewProps) {
  const [steps, setSteps] = useState<LiveStep[]>([]);
  const [siteUrl, setSiteUrl] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSteps = useCallback(async () => {
    const allSteps = await db.steps.where('guideId').equals(guideId).sortBy('index');
    const screenshotIds = allSteps.map(s => s.screenshotId).filter(Boolean) as string[];
    const screenshots = await db.screenshots.where('id').anyOf(screenshotIds).toArray();
    const screenshotMap = new Map(screenshots.map(s => [s.stepId, s]));

    setSteps(prev => {
      const oldUrls = new Map(prev.map(p => [p.step.id, p.objectUrl]));
      const newSteps = allSteps.map(step => {
        const screenshot = screenshotMap.get(step.id);
        const existing = oldUrls.get(step.id);
        if (existing && prev.find(p => p.step.id === step.id)?.screenshot?.id === screenshot?.id) {
          return { step, screenshot, objectUrl: existing };
        }
        if (existing) URL.revokeObjectURL(existing);
        const objectUrl = screenshot?.blob ? URL.createObjectURL(screenshot.blob) : undefined;
        return { step, screenshot, objectUrl };
      });
      return newSteps;
    });

    if (allSteps.length > 0 && !siteUrl) {
      setSiteUrl(allSteps[0].url || '');
    }
  }, [guideId, siteUrl]);

  useEffect(() => {
    loadSteps();
    const interval = setInterval(loadSteps, 800);
    return () => {
      clearInterval(interval);
    };
  }, [loadSteps]);

  useEffect(() => {
    return () => {
      steps.forEach(s => {
        if (s.objectUrl) URL.revokeObjectURL(s.objectUrl);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps.length]);

  useEffect(() => {
    getActiveTab().then(tab => {
      if (tab?.url) setSiteUrl(tab.url);
    });
  }, []);

  const handleDeleteStep = useCallback(async (stepId: string) => {
    const step = await db.steps.get(stepId);
    if (step?.screenshotId) {
      await db.screenshots.delete(step.screenshotId);
    }
    await db.steps.delete(stepId);
    const guide = await db.guides.get(guideId);
    if (guide) {
      const newStepIds = guide.stepIds.filter(id => id !== stepId);
      await db.guides.update(guideId, { stepIds: newStepIds, updatedAt: Date.now() });
      const remaining = await db.steps.where('guideId').equals(guideId).sortBy('index');
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].index !== i) {
          await db.steps.update(remaining[i].id, { index: i });
        }
      }
    }
    await loadSteps();
  }, [guideId, loadSteps]);

  const domain = extractDomain(siteUrl);
  const favicon = getFaviconUrl(siteUrl);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5">
          {/* Site header */}
          <div className="flex items-center gap-3 mb-5">
            {favicon && (
              <img
                src={favicon}
                alt=""
                className="w-8 h-8 rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span className="text-base font-semibold text-gray-900">{domain || 'Recording...'}</span>
          </div>

          {steps.length === 0 ? (
            <p className="text-sm text-gray-400">Ready to capture!</p>
          ) : (
            <div className="space-y-1">
              {steps.map((liveStep, idx) => {
                const isLast = idx === steps.length - 1;
                return (
                  <div key={liveStep.step.id}>
                    {/* Step row */}
                    <div className="flex items-start gap-3 group py-1.5">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-gray-300 text-gray-500 text-xs font-medium flex-shrink-0 mt-0.5">
                        {liveStep.step.index + 1}
                      </span>
                      <p className="text-sm text-gray-800 flex-1 pt-0.5 leading-snug">
                        {liveStep.step.description}
                      </p>
                      <button
                        onClick={() => handleDeleteStep(liveStep.step.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-0.5 flex-shrink-0"
                        title="Delete step"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {/* Show screenshot only for the last step */}
                    {isLast && liveStep.screenshot && (
                      <div className="ml-9 mt-2 mb-2">
                        <ZoomScreenshot
                          screenshot={liveStep.screenshot}
                          alt={`Step ${liveStep.step.index + 1}`}
                          className="shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white">
        <div className="flex items-center justify-center gap-4 py-3 px-4">
          <button
            onClick={onStop}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
            title="Finish recording"
          >
            <Check size={20} strokeWidth={3} />
          </button>
          <button
            onClick={onStop}
            className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
            title="Discard recording"
          >
            <Square size={16} />
          </button>
          <button
            onClick={() => {
              const last = steps[steps.length - 1];
              if (last) handleDeleteStep(last.step.id);
            }}
            className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
            title="Delete last step"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
