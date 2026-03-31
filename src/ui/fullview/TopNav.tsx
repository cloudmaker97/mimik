import {
  FileText,
  Star,
  Trash2,
  ArrowLeft,
  Search,
  ChevronRight,
} from "lucide-react";
import type { Route } from "./router";
import { navigate } from "./router";
import type { Guide, Step, Screenshot } from "@/core/guides/types";
import ExportMenu from "@/ui/sidepanel/ExportMenu";

function MascotIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="20 50 160 120"
      width={size}
      height={Math.round((size * 120) / 160)}
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect x="30" y="95" width="140" height="68" rx="5" fill="#451a03" />
      <path
        d="M30 95 L30 80 Q30 60, 100 60 Q170 60, 170 80 L170 95 Z"
        fill="#572508"
      />
      <rect x="30" y="93" width="140" height="3" fill="#FDE68A" />
      <path
        d="M68 122 Q76 112 84 122"
        stroke="#FDE68A"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M116 122 Q124 112 132 122"
        stroke="#FDE68A"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M84 138 Q100 148 116 138"
        stroke="#FDE68A"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface TopNavProps {
  route: Route;
  guideCounts: { all: number; starred: number; trash: number };
  guideTitle?: string;
  guideData?: {
    guideId: string;
    guide: Guide;
    steps: Step[];
    screenshots: Map<string, Screenshot>;
  };
  search: string;
  onSearchChange: (value: string) => void;
  onSearchClick?: () => void;
}

export default function TopNav({
  route,
  guideCounts,
  guideTitle,
  guideData,
  search,
  onSearchChange,
  onSearchClick,
}: TopNavProps) {
  const navItems: {
    key: "all" | "starred" | "trash";
    label: string;
    icon: typeof FileText;
    count: number;
  }[] = [
    { key: "all", label: "All Guides", icon: FileText, count: guideCounts.all },
    {
      key: "starred",
      label: "Starred",
      icon: Star,
      count: guideCounts.starred,
    },
    { key: "trash", label: "Trash", icon: Trash2, count: guideCounts.trash },
  ];

  return (
    <header
      className="flex items-center gap-5 px-7 h-16 flex-shrink-0"
      style={{
        background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
      }}
    >
      {/* Brand — click to go home */}
      <button
        onClick={() => navigate({ page: "library", category: "all" })}
        className="flex items-center gap-2 mr-4 cursor-pointer h-full"
      >
        <div className="mb-1">
          <MascotIcon size={22} />
        </div>
        <span
          className="text-[15px] font-bold tracking-tight"
          style={{ color: "#451a03" }}
        >
          Mimik
        </span>
      </button>

      {route.page === "guide" ? (
        <>
          {guideTitle && (
            <>
              <ChevronRight
                size={14}
                style={{ color: "#451a03", opacity: 0.25 }}
              />
              <span
                className="text-[13px] font-medium truncate max-w-sm"
                style={{ color: "#451a03" }}
              >
                {guideTitle}
              </span>
            </>
          )}
        </>
      ) : (
        navItems.map((item) => {
          const active =
            route.page === "library" && route.category === item.key;
          return (
            <button
              key={item.key}
              onClick={() => navigate({ page: "library", category: item.key })}
              className="flex items-center gap-1.5 text-[13px] h-8 px-3 rounded-md transition-all"
              style={{
                color: active ? "#FDE68A" : "#78350F",
                background: active ? "#451a03" : "transparent",
                fontWeight: active ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!active)
                  e.currentTarget.style.background = "rgba(69,26,3,0.1)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <item.icon size={13.5} />
              {item.label}
              {item.count > 0 && (
                <span
                  className="text-[11px] ml-0.5"
                  style={{
                    color: active ? "rgba(253,230,138,0.7)" : "#92400E",
                  }}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })
      )}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 px-3 h-8 rounded-lg w-52 cursor-pointer"
          style={{ background: "rgba(255,255,255,0.4)", border: 0 }}
        >
          <Search
            size={14}
            className="flex-shrink-0"
            style={{ color: "#92400E" }}
          />
          <span className="text-[12px] flex-1 text-left" style={{ color: "#92400E" }}>
            Search guides...
          </span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(69,26,3,0.1)", color: "#92400E" }}>
            ⌘K
          </span>
        </button>
        {guideData && (
          <ExportMenu
            guideId={guideData.guideId}
            guide={guideData.guide}
            steps={guideData.steps}
            screenshots={guideData.screenshots}
          />
        )}
      </div>
    </header>
  );
}
