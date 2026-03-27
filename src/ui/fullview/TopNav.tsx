import { FileText, Star, Trash2, ArrowLeft, Search } from 'lucide-react';
import type { Route } from './router';
import { navigate } from './router';

function MascotIcon({ size = 22 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="20 50 160 120" width={size} height={Math.round(size * 120 / 160)}>
      <rect x="30" y="95" width="140" height="68" rx="5" fill="#451a03"/>
      <path d="M30 95 L30 80 Q30 60, 100 60 Q170 60, 170 80 L170 95 Z" fill="#572508"/>
      <rect x="30" y="93" width="140" height="3" fill="#FDE68A"/>
      <path d="M68 122 Q76 112 84 122" stroke="#FDE68A" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <path d="M116 122 Q124 112 132 122" stroke="#FDE68A" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <path d="M84 138 Q100 148 116 138" stroke="#FDE68A" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

interface TopNavProps {
  route: Route;
  guideCounts: { all: number; starred: number; trash: number };
  guideTitle?: string;
  search: string;
  onSearchChange: (value: string) => void;
}

export default function TopNav({ route, guideCounts, guideTitle, search, onSearchChange }: TopNavProps) {
  const navItems: { key: 'all' | 'starred' | 'trash'; label: string; icon: typeof FileText; count: number }[] = [
    { key: 'all', label: 'All Guides', icon: FileText, count: guideCounts.all },
    { key: 'starred', label: 'Starred', icon: Star, count: guideCounts.starred },
    { key: 'trash', label: 'Trash', icon: Trash2, count: guideCounts.trash },
  ];

  return (
    <header
      className="flex items-center gap-5 px-7 h-14 flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' }}
    >
      {/* Brand — click to go home */}
      <button
        onClick={() => navigate({ page: 'library', category: 'all' })}
        className="flex items-center gap-2.5 mr-4 cursor-pointer"
      >
        <MascotIcon size={26} />
        <span className="text-[16px] font-bold tracking-tight" style={{ color: '#451a03' }}>Mimik</span>
      </button>

      {route.page === 'guide' ? (
        /* Guide mode: back button + guide title */
        <>
          <button
            onClick={() => navigate({ page: 'library', category: 'all' })}
            className="flex items-center gap-1.5 text-[13px] font-medium rounded-md px-3 py-1.5 transition-colors"
            style={{ color: '#78350F' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ArrowLeft size={15} />
            All Guides
          </button>
          {guideTitle && (
            <>
              <span style={{ color: '#92400E' }} className="text-xs">&gt;</span>
              <span className="text-[13px] font-medium truncate max-w-xs" style={{ color: '#451a03' }}>
                {guideTitle}
              </span>
            </>
          )}
        </>
      ) : (
        /* Library mode: nav items */
        navItems.map(item => {
          const active = route.page === 'library' && route.category === item.key;
          return (
            <button
              key={item.key}
              onClick={() => navigate({ page: 'library', category: item.key })}
              className="flex items-center gap-2 text-[13px] px-3 py-1.5 rounded-md transition-colors"
              style={{
                color: active ? '#451a03' : '#78350F',
                background: active ? 'rgba(255,255,255,0.4)' : 'transparent',
                fontWeight: active ? 600 : 500,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <item.icon size={15} />
              {item.label}
              {item.count > 0 && (
                <span className="text-[11px] ml-0.5" style={{ color: '#92400E' }}>{item.count}</span>
              )}
            </button>
          );
        })
      )}

      {/* Search — right side */}
      <div className="ml-auto relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#92400E' }} />
        <input
          type="text"
          placeholder="Search guides..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-3 py-1.5 text-[13px] rounded-lg border-none outline-none w-52"
          style={{ background: 'rgba(255,255,255,0.4)', color: '#451a03' }}
          onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.6)'; }}
          onBlur={(e) => { e.target.style.background = 'rgba(255,255,255,0.4)'; }}
        />
      </div>
    </header>
  );
}
