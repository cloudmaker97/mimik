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
      className={`p-3 border rounded-lg mb-2 ${dragOver ? 'border-t-2 border-amber-500' : 'border-gray-200'}`}
    >
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <div className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing">
            <GripVertical size={14} className="text-gray-300" />
          </div>
        )}
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex-shrink-0 mt-0.5">
          {step.index + 1}
        </span>
        <div className="flex-1 min-w-0">
          {screenshot ? (
            <ZoomScreenshot
              screenshot={screenshot}
              alt={`Step ${step.index + 1} screenshot`}
              className="mb-2"
            />
          ) : (
            <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm mb-2">
              No screenshot
            </div>
          )}
          <textarea
            className="w-full text-sm border border-transparent hover:border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded p-1 resize-none"
            value={description}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
              {step.action}
            </span>
            <div className="flex items-center gap-1">
              {screenshot && (
                <>
                  <button
                    onClick={() => onBlur?.(step.id)}
                    className="text-gray-400 hover:text-amber-500 p-1 rounded"
                    title="Blur sensitive area"
                  >
                    <EyeOff size={14} />
                  </button>
                  <button
                    onClick={handleCopy}
                    className={`p-1 rounded ${copied ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
                    title="Copy screenshot"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </>
              )}
              <button
                onClick={handleDelete}
                className="text-gray-400 hover:text-red-500 p-1 rounded"
                title="Delete step"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
