const hints = [
  { key: '↑↓', label: 'navigate' },
  { key: '↵', label: 'open' },
  { key: 'esc', label: 'close' },
];

export default function KeyboardHints() {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-border">
      {hints.map((h) => (
        <span key={h.key} className="contents">
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-lavender text-muted-foreground">
            {h.key}
          </span>
          <span className="text-[10px] text-purple">{h.label}</span>
        </span>
      ))}
    </div>
  );
}
