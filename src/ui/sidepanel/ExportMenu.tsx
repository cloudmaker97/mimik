import { useState, useEffect, useRef } from 'react';
import { Download, FileCode, FileText, FileDown, Loader2 } from 'lucide-react';
import type { Guide, Step, Screenshot } from '@/core/guides/types';
import { exportGuideAsHTML } from '@/core/export/html-export';
import { exportGuideAsMarkdown } from '@/core/export/markdown-export';
import { exportGuideAsPDF } from '@/core/export/pdf-export';

interface ExportMenuProps {
  guideId: string;
  guide: Guide;
  steps: Step[];
  screenshots: Map<string, Screenshot>;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportMenu({ guide, steps, screenshots }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  async function handleExportHTML() {
    setOpen(false);
    setExporting(true);
    try {
      const html = await exportGuideAsHTML(guide, steps, screenshots);
      downloadFile(html, `${guide.title}.html`, 'text/html');
    } finally {
      setExporting(false);
    }
  }

  async function handleExportMarkdown() {
    setOpen(false);
    setExporting(true);
    try {
      const md = await exportGuideAsMarkdown(guide, steps, screenshots);
      downloadFile(md, `${guide.title}.md`, 'text/markdown');
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPDF() {
    setOpen(false);
    setExporting(true);
    try {
      const blob = await exportGuideAsPDF(guide, steps, screenshots);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${guide.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: '#451a03', color: '#FDE68A' }}
        onClick={() => setOpen(prev => !prev)}
        disabled={exporting}
        title="Export guide"
      >
        {exporting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        Export
      </button>

      {open && !exporting && (
        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={handleExportHTML}
          >
            <FileCode size={14} />
            HTML
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={handleExportMarkdown}
          >
            <FileText size={14} />
            Markdown
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={handleExportPDF}
          >
            <FileDown size={14} />
            PDF
          </button>
        </div>
      )}
    </div>
  );
}
