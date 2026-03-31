# Mimik

Open-source Chrome extension that auto-captures browser workflows and generates step-by-step guides. No backend, no account, no data leaves the browser.

## What It Does

You click "Record," perform a workflow in your browser, and Mimik automatically captures each action as a step with an annotated screenshot and description. You can edit the guide, replay it on a live page, or export it as a file.

**Core loop: Record → Edit → Replay or Export.**

## Architecture

**Everything runs in the Chrome extension. No backend.**

- Storage: IndexedDB via Dexie.js (browser-local)
- AI descriptions: optional, user provides their own API key in settings
- Export: generated client-side (no server rendering)
- No auth, no database, no hosting, no Docker

### Directory Structure

```
src/
├── core/                    # Business logic (no UI dependencies)
│   ├── capture/             # Recording pipeline, event detection, screenshots
│   ├── export/              # HTML, PDF, Markdown export generators
│   └── guides/              # Data layer: types, Dexie DB, CRUD service
├── entrypoints/             # Chrome extension entry points (WXT)
│   ├── background/          # Service worker: state machine, message handlers, tab management
│   ├── content.ts           # Content script: event capture, overlay, rrweb recording
│   ├── sidepanel/           # Side panel React mount
│   ├── fullview/            # Full-page view React mount
│   └── options/             # Settings page React mount
├── lib/                     # Shared utilities
│   ├── messaging.ts         # Extension messaging protocol (webext-core)
│   ├── port.ts              # Long-lived port: background ↔ sidepanel
│   ├── browser-api.ts       # Chrome API wrappers
│   ├── tab-messages.ts      # Content script message types
│   ├── logger.ts            # Logging utility
│   └── utils.ts             # Shared helpers (dates, URLs, cn)
├── stores/                  # Zustand state stores
│   └── fullview.ts          # Fullview UI state (search, counts, guide data)
└── ui/                      # React components
    ├── components/ui/       # shadcn/ui primitives (button, input, dialog, badge)
    ├── fullview/            # Full-page dashboard
    │   ├── components/      # Extracted sub-components (grid, list, search, etc.)
    │   ├── App.tsx
    │   ├── TopNav.tsx
    │   ├── SearchModal.tsx
    │   ├── GuideContent.tsx
    │   ├── LibraryContent.tsx
    │   └── router.ts
    ├── sidepanel/           # Side panel UI
    │   ├── App.tsx
    │   ├── LibraryView.tsx
    │   ├── GuideEditor.tsx
    │   ├── RecordingView.tsx
    │   ├── StepCard.tsx
    │   ├── ExportMenu.tsx
    │   ├── BlurCanvas.tsx
    │   └── ZoomScreenshot.tsx
    └── options/             # Settings page
        └── App.tsx
```

## State Management

| Layer | Tool | Purpose |
|-------|------|---------|
| Capture lifecycle | xstate | State machine (IDLE ↔ RECORDING) in background service worker |
| Fullview UI | Zustand | Search modal, guide counts, active guide data |
| Persistence | Dexie (IndexedDB) | Guides, steps, screenshots, rrweb chunks |
| Service worker recovery | sessionStorage | xstate machine snapshot persistence |
| Background → Sidepanel | Port messaging | Real-time state broadcast |

## Extension Entry Points

| Entry Point | File | Purpose |
|-------------|------|---------|
| Background | `entrypoints/background/` | Service worker: xstate actor, message handlers, tab management, navigation tracking |
| Content Script | `entrypoints/content.ts` | Injected into all tabs: CaptureSession, event listeners, rrweb, highlight overlay |
| Side Panel | `entrypoints/sidepanel/` | Recording controls, library, guide editor |
| Full View | `entrypoints/fullview/` | Dashboard: library browse, guide viewer, Ctrl+K search |
| Options | `entrypoints/options/` | AI API key settings (OpenAI / Anthropic) |

## Messaging

```
Content Script ←→ Background Service Worker ←→ Sidepanel / Fullview
```

**Extension messages** (webext-core, `lib/messaging.ts`):
- `getState` → current capture state, step count, guide ID
- `startRecording({url})` → creates guide, returns guideId
- `stopRecording()` → finalizes guide
- `userAction({guideId, action, elementMeta})` → processes captured step
- `rrwebChunk({guideId, events, timestamp})` → stores DOM recording chunk

**Tab messages** (content script ↔ background, `lib/tab-messages.ts`):
- `PING` / `START_CAPTURE` / `STOP_CAPTURE` — lifecycle
- `HIDE_OVERLAY` / `SHOW_OVERLAY` — overlay toggle before/after screenshot
- `SHOW_NOTIFICATION` — "Recording started" overlay
- `URL_CHANGED` / `GET_ROUTE` — SPA navigation tracking

## Capture Pipeline

**Start recording:**
1. User clicks "Start Capture" in sidepanel
2. Background transitions xstate machine IDLE → RECORDING
3. Creates Guide in IndexedDB, broadcasts `START_CAPTURE` to all tabs
4. Content scripts initialize CaptureSession (event listeners + rrweb)
5. Shows recording notification overlay on active tab

**Capture a step:**
1. Content script detects user action (click, input, drag)
2. Extracts ElementMeta (selector, text, aria labels, position)
3. Sends `userAction` to background
4. Background hides overlay → `captureVisibleTab` → shows overlay
5. Optionally sends screenshot to AI for description (OpenAI/Anthropic)
6. Saves Step + Screenshot to IndexedDB

**Stop recording:**
1. Background transitions RECORDING → IDLE
2. Broadcasts `STOP_CAPTURE`, content scripts flush rrweb events
3. Opens fullview dashboard with the guide

## Export Formats

| Format | Generator | Details |
|--------|-----------|---------|
| HTML | `core/export/html-export.ts` | Self-contained, base64 images, inline CSS |
| PDF | `core/export/pdf-export.ts` | jsPDF, A4 portrait, auto page breaks |
| Markdown | `core/export/markdown-export.ts` | Standard MD with base64 image data URLs |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension framework | WXT (Manifest V3) |
| Language | TypeScript |
| UI | React 19 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| State (capture) | xstate |
| State (UI) | Zustand |
| Storage | Dexie.js (IndexedDB) |
| Messaging | webext-core |
| Session recording | rrweb |
| Export | jsPDF, client-side HTML/Markdown |
| AI (optional) | OpenAI SDK, Anthropic SDK |
| Icons | Lucide React |
| Dates | dayjs |
| DOM utils | css-selector-generator |

## Design System

All colors are defined as CSS variables in `src/ui/sidepanel/index.css` and used via Tailwind classes:

| Token | Color | Usage |
|-------|-------|-------|
| `--color-foreground` | `#451a03` | Primary text |
| `--color-muted-foreground` | `#92400E` | Secondary text |
| `--color-warm` | `#B45309` | Tertiary text |
| `--color-border` | `#E8E2DA` | Borders, dividers |
| `--color-secondary` | `#FEF3C7` | Light wash backgrounds |
| `--color-gold` | `#FDE68A` | Accent highlights |
| `--color-amber` | `#F59E0B` | Primary amber |
| `--color-primary` | `#451a03` | Dark backgrounds, badges |
| `--color-primary-foreground` | `#FDE68A` | Text on dark backgrounds |

Font: Poppins (loaded via `@fontsource/poppins`).

## Key Technical Details

- **Screenshot capture** uses `chrome.tabs.captureVisibleTab` with overlay hidden to avoid capturing the highlight
- **Event deduplication** merges fast clicks within 300ms on same element; max 4 clicks per 800ms window
- **Highlight overlay** uses a custom web component (`<mimik-highlight>`) with closed Shadow DOM at max z-index
- **Content script injection** pings first, falls back to `chrome.scripting.executeScript()` for tabs without the script
- **xstate snapshot** persisted to sessionStorage so the state machine survives service worker restarts
- **Recording notification** uses `animationend` event (not hardcoded delays) for timing
- **Font loading** uses `@fontsource/poppins` (CSP-safe, no CDN dependency)
