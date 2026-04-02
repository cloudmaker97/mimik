import { create } from 'zustand';
import type { Guide, Screenshot, Step } from '@/core/guides/types';

interface GuideExportData {
  guideId: string;
  guide: Guide;
  steps: Step[];
  screenshots: Map<string, Screenshot>;
}

interface FullviewStore {
  // Library
  counts: { all: number; starred: number; trash: number };
  setCounts: (counts: { all: number; starred: number; trash: number }) => void;

  // Search modal
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;

  // Guide view
  guideTitle: string;
  setGuideTitle: (title: string) => void;
  guideStepCount: number;
  setGuideStepCount: (count: number) => void;
  guideExportData: GuideExportData | null;
  setGuideExportData: (data: GuideExportData | null) => void;
  scrollToStepId: string | null;
  scrollToStep: (stepId: string) => void;
  activeStepId: string | null;
  setActiveStepId: (id: string | null) => void;
}

export const useFullviewStore = create<FullviewStore>((set) => ({
  counts: { all: 0, starred: 0, trash: 0 },
  setCounts: (counts) => set({ counts }),

  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),

  guideTitle: '',
  setGuideTitle: (guideTitle) => set({ guideTitle }),
  guideStepCount: 0,
  setGuideStepCount: (guideStepCount) => set({ guideStepCount }),
  guideExportData: null,
  setGuideExportData: (guideExportData) => set({ guideExportData }),
  scrollToStepId: null,
  scrollToStep: (stepId) => {
    set({ scrollToStepId: stepId });
    setTimeout(() => set({ scrollToStepId: null }), 100);
  },
  activeStepId: null,
  setActiveStepId: (activeStepId) => set({ activeStepId }),
}));
