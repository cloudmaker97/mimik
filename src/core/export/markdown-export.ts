import { blobToBase64, extractDomain, formatDate } from '@/core/export/utils';
import type { Guide, Screenshot, Step } from '@/core/guides/types';

export async function exportGuideAsMarkdown(
  guide: Guide,
  steps: Step[],
  screenshots: Map<string, Screenshot>,
): Promise<string> {
  const domain = extractDomain(steps);
  const meta = [
    `${steps.length} steps`,
    `Created ${formatDate(guide.createdAt)}`,
    ...(domain ? [`Source: ${domain}`] : []),
  ].join(' · ');

  const lines: string[] = [`# ${guide.title}`, '', `*${meta}*`, '', '---', ''];

  for (const step of steps) {
    const num = String(step.index + 1).padStart(2, '0');
    lines.push(`## Step ${num}: ${step.description}`, '');

    const screenshot = screenshots.get(step.id);
    if (screenshot) {
      const b64 = await blobToBase64(screenshot.blob);
      lines.push(`![Step ${num}](data:${screenshot.mimeType};base64,${b64})`, '');
    }
  }

  return lines.join('\n');
}
