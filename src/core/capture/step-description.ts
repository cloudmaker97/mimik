import type { ElementMeta } from '@/core/guides/types';

export function buildFallbackDescription(action: string, meta: ElementMeta): string {
  const target = meta.ariaLabel
    || meta.placeholder
    || meta.textContent?.slice(0, 80)
    || meta.altText
    || meta.name
    || meta.role
    || meta.tag;

  if (action.startsWith('keydown:')) {
    const key = action.split(':')[1];
    return `Press ${key} on ${target}`;
  }

  switch (action) {
    case 'click':
    case 'auxclick':
      if (meta.tag === 'input' && meta.inputType === 'checkbox') return `Toggle checkbox ${target}`;
      if (meta.tag === 'input' && meta.inputType === 'radio') return `Select radio ${target}`;
      if (meta.href) return `Click link "${target}"`;
      return `Click ${target}`;
    case 'input':
      if (meta.inputType) return `Type into ${meta.inputType} field ${target}`;
      return `Type into ${target}`;
    case 'copy':
      return `Copy from ${target}`;
    case 'paste':
      return `Paste into ${target}`;
    case 'cut':
      return `Cut from ${target}`;
    case 'drag':
      return `Drag ${target}`;
    case 'navigate':
      return 'Navigate to page';
    default:
      return `${action} ${target}`;
  }
}
