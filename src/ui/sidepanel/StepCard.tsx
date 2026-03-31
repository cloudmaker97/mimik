import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { Trash2, GripVertical, EyeOff, Copy, Check } from 'lucide-react';
import type { Step, Screenshot } from '@/core/guides/types';
import ZoomScreenshot from './ZoomScreenshot';

interface DragHandleProps {
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

interface StepCardProps {
  step: Step;
  screenshot: Screenshot | undefined;
  onDescriptionChange: (stepId: string, description: string) => void;
  onDelete: (stepId: string) => void;
  dragHandleProps?: DragHandleProps;
  onBlur?: (stepId: string) => void;
  onCopy?: (stepId: string) => void;
}

export default function StepCard({
  step,
  screenshot,
  onDescriptionChange,
  onDelete,
  dragHandleProps,
  onBlur,
}: StepCardProps) {
  const [description, setDescription] = useState(step.description);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (screenshot?.blob) {
      const url = URL.createObjectURL(screenshot.blob);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [screenshot]);

  useEffect(() => {
    setDescription(step.description);
  }, [step.description]);

  const handleDescriptionBlur = () => {
    if (description !== step.description) {
      onDescriptionChange(step.id, description);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Delete this step?')) {
      onDelete(step.id);
    }
  };

  const handleCopy = async () => {
    if (!screenshot) return;
    try {
      const item = new ClipboardItem({ [screenshot.mimeType]: screenshot.blob });
      await navigator.clipboard.write([item]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      logger.error(' Copy to clipboard failed', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
    dragHandleProps?.onDragOver(e);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDragEnd = () => {
    setDragOver(false);
    dragHandleProps?.onDragEnd();
  };

  return (
    <div
      draggable={!!dragHandleProps}
      onDragStart={dragHandleProps?.onDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
      className={`rounded-xl mb-3 overflow-hidden transition-shadow ${dragOver ? 'ring-2 ring-amber-500' : ''}`}
      style={{ border: '1px solid #E8E2DA', background: '#fff' }}
    >
      {/* Screenshot */}
      {screenshot ? (
        <ZoomScreenshot
          screenshot={screenshot}
          alt={`Step ${step.index + 1} screenshot`}
          className="!rounded-none !border-0"
        />
      ) : (
        <div className="w-full h-32 flex items-center justify-center text-sm" style={{ background: '#f5f3ef', color: '#9ca3af' }}>
          No screenshot
        </div>
      )}

      {/* Body */}
      <div className="px-3 pt-2 pb-2">
        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-bold flex-shrink-0"
            style={{ background: '#451a03', color: '#FDE68A' }}
          >
            {step.index + 1}
          </span>
          <textarea
            className="w-full text-[13px] font-medium resize-none outline-none border-0 bg-transparent p-0 leading-snug flex-1"
            style={{ color: '#451a03' }}
            value={description}
            rows={1}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
          />
        </div>
        <div className="flex items-center justify-end mt-1">
          <div className="flex items-center gap-0.5">
            {screenshot && (
              <>
                <button
                  onClick={() => onBlur?.(step.id)}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: '#d1d5db' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#F59E0B'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#d1d5db'; }}
                  title="Blur sensitive area"
                >
                  <EyeOff size={13} />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: copied ? '#16a34a' : '#d1d5db' }}
                  onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = '#16a34a'; }}
                  onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = '#d1d5db'; }}
                  title="Copy screenshot"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              className="p-1 rounded-md transition-colors"
              style={{ color: '#d1d5db' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#d1d5db'; }}
              title="Delete step"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
