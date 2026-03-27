import { FileText, Star, Trash2, ArrowLeft } from 'lucide-react';
import type { Route } from './router';
import { navigate } from './router';
import type { Step } from '@/core/guides/types';

interface SidebarProps {
  route: Route;
  guideCounts: { all: number; starred: number; trash: number };
  guideSteps?: Step[];
  guideDomain?: string;
  guideFavicon?: string;
  activeStepId?: string | null;
  onStepClick?: (stepId: string) => void;
}

export default function Sidebar({
  route, guideCounts, guideSteps, guideDomain, guideFavicon, activeStepId, onStepClick,
}: SidebarProps) {
  if (route.page === 'guide' && guideSteps) {
    return (
      <aside className="w-60 h-screen flex flex-col border-r border-gray-200 bg-white fixed left-0 top-0">
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={() => navigate({ page: 'library', category: 'all' })}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} />
            Back to Library
          </button>
        </div>
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          {guideFavicon && (
            <img src={guideFavicon} alt="" className="w-5 h-5 rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <span className="text-sm font-medium text-gray-700 truncate">{guideDomain || 'Guide'}</span>
          <span className="text-xs text-gray-400 ml-auto">{guideSteps.length} steps</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {guideSteps.map(step => (
            <button
              key={step.id}
              onClick={() => onStepClick?.(step.id)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                activeStepId === step.id
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-xs font-medium text-gray-400 w-4 text-right flex-shrink-0">
                {step.index + 1}.
              </span>
              <span className="truncate">{step.description}</span>
            </button>
          ))}
        </nav>
      </aside>
    );
  }

  const navItems: { key: 'all' | 'starred' | 'trash'; label: string; icon: typeof FileText; count: number }[] = [
    { key: 'all', label: 'All Guides', icon: FileText, count: guideCounts.all },
    { key: 'starred', label: 'Starred', icon: Star, count: guideCounts.starred },
    { key: 'trash', label: 'Trash', icon: Trash2, count: guideCounts.trash },
  ];

  return (
    <aside className="w-60 h-screen flex flex-col border-r border-gray-200 bg-white fixed left-0 top-0">
      <div className="p-5 pb-3">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">Mimik</h1>
      </div>
      <nav className="flex-1 px-3 py-2">
        {navItems.map(item => {
          const active = route.page === 'library' && route.category === item.key;
          return (
            <button
              key={item.key}
              onClick={() => navigate({ page: 'library', category: item.key })}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                active ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon size={16} className={active ? 'text-gray-700' : 'text-gray-400'} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count > 0 && (
                <span className="text-xs text-gray-400">{item.count}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
