<p align="center">
  <img src="public/mascot.svg" width="120" height="120" alt="Mimik mascot" />
</p>

<h1 align="center">Mimik</h1>

<p align="center">
  <strong>Auto-capture browser workflows into step-by-step guides — no account needed.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-4F46E5?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/chrome-extension-1E1B4B?style=flat-square&logo=googlechrome&logoColor=C7D2FE" alt="Chrome Extension" />
  <img src="https://img.shields.io/badge/manifest-v3-3730A3?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/storage-100%25%20local-1E1B4B?style=flat-square" alt="100% Local" />
  <img src="https://img.shields.io/badge/sign%20up-not%20required-4F46E5?style=flat-square" alt="No Account Required" />
</p>

---

## Features

- **Auto-capture** — Records clicks, inputs, keyboard shortcuts, clipboard actions, and drag events as you browse
- **Annotated screenshots** — Every step gets a zoomed, highlighted screenshot focused on the element you interacted with
- **Smart event merging** — Deduplicates rapid clicks on nearby elements so your guides stay clean
- **Click interception** — Captures the step before the page navigates away, so nothing gets lost
- **Side panel** — Quick-access capture controls and guide review without leaving your current tab
- **Full dashboard** — Manage all your guides in a dedicated full-page view with search, star, and trash
- **Export** — Copy or download guides for sharing
- **100% local** — Everything stored in IndexedDB on your device. Zero cloud. Zero sign-up. Zero tracking.

## Screenshots

> Coming soon — side panel and full dashboard screenshots

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | [WXT](https://wxt.dev) (Web Extension Tools) |
| UI | React 19 + Tailwind CSS |
| Storage | [Dexie.js](https://dexie.org) (IndexedDB wrapper) |
| State | [XState](https://xstate.js.org) (capture lifecycle) |
| Language | TypeScript |
| Extension | Chrome Manifest V3 |

## Getting Started

```bash
# Clone the repo
git clone https://github.com/westpoint-io/mimik.git
cd mimik

# Install dependencies
npm install

# Build the extension
npx wxt build

# Load in Chrome
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the .output/chrome-mv3 folder
```

### Firefox

Mimik builds for Firefox from the same codebase.

```bash
pnpm dev:firefox           # development
pnpm build:firefox         # production build
pnpm zip:firefox           # package for addons.mozilla.org
pnpm zip:all               # both Chrome and Firefox
```

Firefox build output lands in `.output/firefox-mv3/`.

## Project Structure

```
src/
├── core/                    # Business logic (no UI)
│   ├── capture/             # Recording pipeline (events, AI, DOM context)
│   ├── blur/                # Smart blur (regex presets, DOM scanner, panel)
│   ├── export/              # HTML, PDF, Markdown generators + utils
│   └── guides/              # Data layer (types, Dexie DB, CRUD)
├── entrypoints/             # Chrome extension entry points (WXT)
│   ├── background/          # Service worker
│   ├── content.ts           # Content script
│   ├── sidepanel/           # Side panel
│   ├── fullview/            # Full-page dashboard
│   ├── onboarding/          # First-install wizard
│   └── options/             # Settings page
├── lib/                     # Shared utilities
├── stores/                  # Zustand state stores
└── ui/                      # React components
    ├── fullview/            # Dashboard views
    ├── sidepanel/           # Side panel views
    ├── onboarding/          # Onboarding wizard
    ├── shared/              # Shared components
    └── components/ui/       # shadcn/ui primitives
```

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
