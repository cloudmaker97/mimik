import { Check, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteStep, getScreenshotsForSteps, getStepsForGuide } from '@/core/guides/service';
import type { Screenshot, Step } from '@/core/guides/types';
import { getActiveTab } from '@/lib/browser-api';
import { extractDomain } from '@/lib/utils';
import { Button } from '@/ui/components/ui/button';
import ZoomScreenshot from './ZoomScreenshot';

interface RecordingViewProps {
  guideId: string;
  onStop: () => void;
}

function timeAgo(createdAt: number): string {
  const diff = Math.floor((Date.now() - createdAt) / 1000);
  if (diff < 3) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

interface LiveStep {
  step: Step;
  screenshot?: Screenshot;
}

export default function RecordingView({ guideId, onStop }: RecordingViewProps) {
  const [steps, setSteps] = useState<LiveStep[]>([]);
  const [siteUrl, setSiteUrl] = useState('');
  const [, setTick] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSteps = useCallback(async () => {
    const allSteps = await getStepsForGuide(guideId);
    const screenshotIds = allSteps.map((s) => s.screenshotId).filter(Boolean) as string[];
    const screenshotMap = await getScreenshotsForSteps(screenshotIds);

    setSteps(
      allSteps.map((step) => ({
        step,
        screenshot: screenshotMap.get(step.id),
      })),
    );

    if (allSteps.length > 0 && !siteUrl) {
      setSiteUrl(allSteps[0].url || '');
    }
  }, [guideId, siteUrl]);

  useEffect(() => {
    loadSteps();
    const interval = setInterval(loadSteps, 800);
    return () => clearInterval(interval);
  }, [loadSteps]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (steps.length === 0) return;
    const scroll = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    scroll();
    const t = setTimeout(scroll, 300);
    return () => clearTimeout(t);
  }, [steps.length]);

  useEffect(() => {
    getActiveTab().then((tab) => {
      if (tab?.url) setSiteUrl(tab.url);
    });
  }, []);

  const handleDeleteStep = useCallback(
    async (stepId: string) => {
      await deleteStep(guideId, stepId);
      await loadSteps();
    },
    [guideId, loadSteps],
  );

  const _domain = extractDomain(siteUrl);
  return (
    <div className="flex flex-col h-screen bg-card relative">
      {/* Floating recording pill */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-border shadow-sm">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-semibold text-foreground">
          Recording · {steps.length} {steps.length === 1 ? 'step' : 'steps'}
        </span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto pt-12">
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg width="64" height="64" viewBox="0 0 200 200" fill="none">
              <rect x="30" y="105" width="140" height="68" rx="5" fill="#4C1D95" />
              <path d="M30 105 L30 90 Q30 70, 100 70 Q170 70, 170 90 L170 105 Z" fill="#6D28D9" />
              <rect x="30" y="103" width="140" height="3" fill="#DDD6FE" />
              <path d="M68 132 Q76 122 84 132" stroke="#DDD6FE" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M116 132 Q124 122 132 132" stroke="#DDD6FE" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M84 148 Q100 158 116 148" stroke="#DDD6FE" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <rect x="60" y="38" width="80" height="50" rx="8" fill="#5B21B6" stroke="#6D28D9" strokeWidth="2" />
              <circle cx="100" cy="62" r="16" fill="#4C1D95" stroke="#6D28D9" strokeWidth="2" />
              <circle cx="100" cy="62" r="9" fill="#0E0620" />
              <circle cx="100" cy="62" r="4" fill="#DDD6FE" opacity="0.4" />
              <rect x="112" y="42" width="18" height="8" rx="3" fill="#DDD6FE" opacity="0.7" />
              <circle cx="121" cy="38" r="20" fill="#DDD6FE" className="animate-[cam-flash_3s_ease_infinite]" />
              <circle cx="80" cy="42" r="5" fill="#8B5CF6" />
              <ellipse cx="54" cy="64" rx="10" ry="8" fill="#4C1D95" />
              <ellipse cx="146" cy="64" rx="10" ry="8" fill="#4C1D95" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-semibold text-violet">Ready to capture!</p>
              <p className="text-xs text-border mt-0.5">Click on the page to start</p>
            </div>
          </div>
        ) : (
          <div>
            {steps.map((liveStep, idx) => (
              <div key={liveStep.step.id}>
                <div className="px-4 pb-4 group">
                  {liveStep.screenshot && (
                    <div className="mb-2">
                      <ZoomScreenshot
                        screenshot={liveStep.screenshot}
                        alt={liveStep.step.description}
                        className="shadow-sm"
                        crop
                        animate
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-medium leading-snug text-foreground">
                        {liveStep.step.description}
                      </p>
                      <span className="text-[10px] text-purple">
                        {timeAgo(liveStep.step.timestamp)} · {extractDomain(liveStep.step.url || siteUrl)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteStep(liveStep.step.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-border hover:text-red-500"
                      title="Delete step"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                {idx < steps.length - 1 && <div className="mx-4 mb-4 h-px bg-border" />}
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-border px-4 py-2.5 flex items-center gap-2">
        <Button onClick={onStop} className="flex-1 h-10 rounded-full font-semibold text-[13px]">
          <Check size={16} strokeWidth={3} />
          Finish Recording
        </Button>
        <button
          onClick={onStop}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center transition-colors text-purple hover:border-red-300 hover:text-red-400"
          title="Discard"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
