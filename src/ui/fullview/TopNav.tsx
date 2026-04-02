import { ChevronRight, FileText, Search, Star, Trash2 } from 'lucide-react';
import { useFullviewStore } from '@/stores/fullview';
import { Button } from '@/ui/components/ui/button';
import ExportMenu from '@/ui/sidepanel/ExportMenu';
import MascotIcon from './components/MascotIcon';
import type { Route } from './router';
import { navigate } from './router';

interface TopNavProps {
  route: Route;
}

const navItems = [
  { key: 'all' as const, label: 'All Guides', icon: FileText },
  { key: 'starred' as const, label: 'Starred', icon: Star },
  { key: 'trash' as const, label: 'Trash', icon: Trash2 },
];

export default function TopNav({ route }: TopNavProps) {
  const counts = useFullviewStore((s) => s.counts);
  const guideTitle = useFullviewStore((s) => s.guideTitle);
  const guideStepCount = useFullviewStore((s) => s.guideStepCount);
  const exportData = useFullviewStore((s) => s.guideExportData);
  const setSearchOpen = useFullviewStore((s) => s.setSearchOpen);

  return (
    <header className="flex items-center gap-5 px-7 h-16 shrink-0 bg-gradient-to-br from-amber to-amber-light">
      {/* Brand */}
      <button
        onClick={() => navigate({ page: 'library', category: 'all' })}
        className="flex items-center gap-2 mr-4 cursor-pointer h-full"
      >
        <div className="mb-1">
          <MascotIcon size={22} />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-foreground">Mimik</span>
      </button>

      {route.page === 'guide'
        ? guideTitle && (
            <>
              <ChevronRight size={14} className="text-foreground opacity-25" />
              {guideTitle === 'Untitled Guide' && guideStepCount > 0 ? (
                <span className="text-[13px] font-medium truncate max-w-sm animate-gradient-text bg-[length:300%_100%] bg-clip-text text-transparent bg-gradient-to-r from-muted-foreground via-amber to-muted-foreground">
                  Generating title...
                </span>
              ) : (
                <span className="text-[13px] font-medium truncate max-w-sm text-foreground">{guideTitle}</span>
              )}
            </>
          )
        : navItems.map((item) => {
            const active = route.page === 'library' && route.category === item.key;
            const count = counts[item.key];
            return (
              <button
                key={item.key}
                onClick={() => navigate({ page: 'library', category: item.key })}
                className={`flex items-center gap-1.5 text-[13px] h-8 px-3 rounded-md transition-all
                ${active ? 'bg-primary text-primary-foreground font-semibold' : 'text-brown font-medium hover:bg-foreground/10'}`}
              >
                <item.icon size={13.5} />
                {item.label}
                {count > 0 && (
                  <span className={`text-[11px] ml-0.5 ${active ? 'text-primary-foreground/70' : 'text-amber-dark'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 h-8 rounded-lg w-52 cursor-pointer bg-white/40 border-0 hover:bg-white/60"
        >
          <Search size={14} className="shrink-0 text-amber-dark" />
          <span className="text-[12px] flex-1 text-left text-amber-dark">Search guides...</span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-foreground/10 text-amber-dark">⌘K</span>
        </Button>
        {route.page === 'guide' && exportData && (
          <ExportMenu
            guideId={exportData.guideId}
            guide={exportData.guide}
            steps={exportData.steps}
            screenshots={exportData.screenshots}
          />
        )}
      </div>
    </header>
  );
}
