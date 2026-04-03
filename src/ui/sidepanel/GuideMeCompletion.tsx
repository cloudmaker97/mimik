import { useEffect, useState } from 'react';
import { getStepsForGuide } from '@/core/guides/service';
import type { Step } from '@/core/guides/types';

interface GuideMeCompletionProps {
  guideId: string;
  onDone: () => void;
  onRunAgain: (guideId: string) => void;
}

function CoolMascot() {
  return (
    <svg width="120" height="100" viewBox="20 50 160 120" className="mb-6">
      <rect x="30" y="95" width="140" height="68" rx="8" fill="#451a03" />
      <path d="M30 95 L30 80 Q30 58, 100 58 Q170 58, 170 80 L170 95 Z" fill="#572508" />
      <rect x="30" y="93" width="140" height="3" fill="#FDE68A" />
      <rect x="60" y="112" width="28" height="16" rx="4" fill="#2D1305" stroke="#FDE68A" strokeWidth="2" />
      <rect x="112" y="112" width="28" height="16" rx="4" fill="#2D1305" stroke="#FDE68A" strokeWidth="2" />
      <line x1="88" y1="120" x2="112" y2="120" stroke="#FDE68A" strokeWidth="2" />
      <path d="M88 140 Q100 148 116 142" stroke="#FDE68A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="68" r="4" fill="#F59E0B" />
      <circle cx="150" cy="68" r="4" fill="#F59E0B" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function GuideMeCompletion({ guideId, onDone, onRunAgain }: GuideMeCompletionProps) {
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    getStepsForGuide(guideId).then(setSteps);
  }, [guideId]);

  return (
    <div className="min-h-screen bg-card flex flex-col items-center justify-center px-7 text-center">
      <CoolMascot />

      <h1 className="text-[22px] font-[800] text-foreground mb-2">All done, champ!</h1>

      <p className="text-[13px] text-muted-foreground max-w-[260px] mb-6">
        All {steps.length} steps completed. You've just mastered this workflow like a pro.
      </p>

      <div className="w-full flex flex-col gap-2.5 mb-8">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-2.5 text-left">
            <div className="w-[22px] h-[22px] rounded-full bg-[#059669] flex items-center justify-center shrink-0">
              <CheckIcon />
            </div>
            <span className="text-[13px] text-muted-foreground">{step.description}</span>
          </div>
        ))}
      </div>

      <div className="w-full flex gap-2.5">
        <button
          onClick={onDone}
          className="flex-1 py-3.5 rounded-xl font-semibold text-sm bg-secondary border border-border text-foreground"
        >
          All Done
        </button>
        <button
          onClick={() => onRunAgain(guideId)}
          className="flex-1 py-3.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground"
        >
          Run Again
        </button>
      </div>
    </div>
  );
}
