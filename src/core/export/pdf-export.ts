import { jsPDF } from 'jspdf';
import { blobToDataUrl, extractDomain, formatDate } from '@/core/export/utils';
import type { Guide, Screenshot, Step } from '@/core/guides/types';
import { logger } from '@/lib/logger';

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

  let y = pageHeight / 2 - 30;

  const badgeText = `${steps.length} Steps`;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const badgeWidth = doc.getTextWidth(badgeText) + 8;
  const badgeHeight = 7;
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(margin, y, badgeWidth, badgeHeight, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, margin + 4, y + 4.8);
  y += badgeHeight + 6;

  const segmentWidth = contentWidth / 3;
  doc.setFillColor(139, 92, 246);
  doc.rect(margin, y, segmentWidth, 1.2, 'F');
  doc.setFillColor(167, 139, 250);
  doc.rect(margin + segmentWidth, y, segmentWidth, 1.2, 'F');
  doc.setFillColor(125, 211, 252);
  doc.rect(margin + segmentWidth * 2, y, segmentWidth, 1.2, 'F');
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

  doc.addPage();
  y = margin;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    const descWidth = contentWidth - stepIndent;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(step.description, descWidth);
    const descHeight = descLines.length * 5;

    const screenshot = screenshots.get(step.id);
    let imgDataUrl: string | null = null;
    const imgWidth = contentWidth - stepIndent;
    let imgHeight = 0;

    if (screenshot) {
      try {
        imgDataUrl = await blobToDataUrl(screenshot.blob);
        imgHeight = Math.min((screenshot.height / screenshot.width) * imgWidth, maxImgHeight);
      } catch (err) {
        logger.warn('PDF: failed to load screenshot for step', step.index, err);
      }
    }

    const stepBlockHeight = 6 + descHeight + 6 + imgHeight + stepSpacing;

    if (y + stepBlockHeight > pageHeight - margin && y > margin) {
      doc.addPage();
      y = margin;
    }

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
    doc.text(descLines, margin + stepIndent, y + 4);
    y += descHeight + 6;

    if (imgDataUrl) {
      if (y + imgHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.addImage(imgDataUrl, 'JPEG', margin + stepIndent, y, imgWidth, imgHeight);
      y += imgHeight + stepSpacing;
    } else {
      y += stepSpacing;
    }
  }

  const totalPages = doc.getNumberOfPages();
  const stepPages = totalPages - 1;
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`${p - 1} of ${stepPages}`, pageWidth - margin, pageHeight - margin, { align: 'right' });
  }

  return doc.output('blob');
}
