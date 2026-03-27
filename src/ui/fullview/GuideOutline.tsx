import type { Step } from '@/core/guides/types';

interface GuideOutlineProps {
  steps: Step[];
  domain: string;
  favicon: string;
  activeStepId: string | null;
  onStepClick: (stepId: string) => void;
}

export default function GuideOutline({ steps, domain, favicon, activeStepId, onStepClick }: GuideOutlineProps) {
  if (steps.length === 0) return null;

  return (
    <aside className="w-56 flex-shrink-0 overflow-y-auto p-4" style={{ background: '#fff', borderRight: '1px solid #F0EBE3' }}>
      {/* Site info */}
      <div className="flex items-center gap-2 pb-3 mb-3" style={{ borderBottom: '1px solid #F0EBE3' }}>
        {favicon && (
          <img
            src={favicon}
            alt=""
            className="w-5 h-5 rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <span className="text-[12px] font-medium truncate" style={{ color: '#451a03' }}>{domain || 'Guide'}</span>
        <span className="text-[10px] ml-auto" style={{ color: '#B5A48B' }}>{steps.length} steps</span>
      </div>

      {/* Step outline */}
      <nav className="flex flex-col gap-0.5">
        {steps.map(step => {
          const active = activeStepId === step.id;
          return (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] flex items-center gap-2 transition-colors"
              style={{
                background: active ? '#FEF3C7' : 'transparent',
                color: active ? '#D97706' : '#6B5D40',
                fontWeight: active ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#FAFAF8'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? '#FEF3C7' : 'transparent'; }}
            >
              <span className="w-4 text-right flex-shrink-0" style={{ color: active ? '#D97706' : '#B5A48B' }}>
                {step.index + 1}.
              </span>
              <span className="truncate">{step.description}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
