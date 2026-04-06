import type { Guide, Screenshot, Step } from '@/core/guides/types';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function extractDomain(steps: Step[]): string | null {
  const stepWithUrl = steps.find((s) => s.url);
  if (!stepWithUrl) return null;
  try {
    return new URL(stepWithUrl.url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

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
