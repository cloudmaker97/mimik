import { jsPDF } from 'jspdf';
import type { Guide, Screenshot, Step } from '@/core/guides/types';
import { logger } from '@/lib/logger';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function extractDomain(steps: Step[]): string {
  const firstUrl = steps[0]?.url;
  if (!firstUrl) return '';
  try {
    return new URL(firstUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export async function exportGuideAsPDF(
  guide: Guide,
  steps: Step[],
  screenshots: Map<string, Screenshot>,
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const totalPages = 1 + Math.max(1, steps.length);

  let y = pageHeight / 2 - 30;

  const badgeText = `${steps.length} Steps`;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const badgeWidth = doc.getTextWidth(badgeText) + 8;
  const badgeHeight = 7;
  const badgeX = margin;
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(badgeX, y, badgeWidth, badgeHeight, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, badgeX + 4, y + 4.8);
  y += badgeHeight + 6;

  const gradientY = y;
  const segmentWidth = contentWidth / 3;
  doc.setFillColor(139, 92, 246);
  doc.rect(margin, gradientY, segmentWidth, 1.2, 'F');
  doc.setFillColor(167, 139, 250);
  doc.rect(margin + segmentWidth, gradientY, segmentWidth, 1.2, 'F');
  doc.setFillColor(125, 211, 252);
  doc.rect(margin + segmentWidth * 2, gradientY, segmentWidth, 1.2, 'F');
  y += 8;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 27, 75);
  const titleLines = doc.splitTextToSize(guide.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 9 + 10;

  const cardPadding = 6;
  const domain = extractDomain(steps);
  const dateStr = formatDate(guide.createdAt);

  let cardHeight = cardPadding * 2 + 10;
  if (domain) cardHeight += 14;

  doc.setFillColor(238, 242, 255);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 3, 3, 'F');

  let cardY = y + cardPadding;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 114, 128);
  doc.text('CREATED', margin + cardPadding, cardY + 4);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 27, 75);
  doc.text(dateStr, margin + cardPadding, cardY + 10);

  if (domain) {
    cardY += 14;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 114, 128);
    doc.text('SOURCE', margin + cardPadding, cardY + 4);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(79, 70, 229);
    doc.text(domain, margin + cardPadding, cardY + 10);
  }

  const stepIndent = 16;
  const maxImgHeight = 90;
  const stepSpacing = 6;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    doc.addPage();
    y = margin;

    doc.setDrawColor(199, 210, 254);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;

    const stepNum = String(step.index + 1).padStart(2, '0');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(199, 210, 254);
    doc.text(stepNum, margin, y + 4);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 27, 75);
    const descWidth = contentWidth - stepIndent;
    const descLines = doc.splitTextToSize(step.description, descWidth);
    doc.text(descLines, margin + stepIndent, y + 4);
    y += descLines.length * 5 + 6;

    const screenshot = screenshots.get(step.id);
    if (screenshot) {
      try {
        const dataUrl = await blobToDataUrl(screenshot.blob);
        const imgWidth = contentWidth - stepIndent;
        const imgHeight = Math.min((screenshot.height / screenshot.width) * imgWidth, maxImgHeight);

        if (y + imgHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        doc.addImage(dataUrl, 'JPEG', margin + stepIndent, y, imgWidth, imgHeight);
        y += imgHeight + stepSpacing;
      } catch (err) {
        logger.warn('PDF: failed to embed screenshot for step', step.index, err);
        y += stepSpacing;
      }
    }

    const currentPage = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`${currentPage - 1} of ${totalPages - 1}`, pageWidth - margin, pageHeight - margin, { align: 'right' });
  }

  return doc.output('blob');
}
