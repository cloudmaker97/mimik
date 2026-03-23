# Mimik

Open-source Chrome extension that auto-captures browser workflows and generates step-by-step guides. No backend, no account, no data leaves the browser.

## What It Does

You click "Record," perform a workflow in your browser, and Mimik automatically captures each action as a step with an annotated screenshot and description. You can edit the guide, replay it on a live page, or export it as a file.

**Core loop: Record → Edit → Replay or Export.**

## Architecture

**Everything runs in the Chrome extension. No backend.**

- Storage: IndexedDB (browser-local)
- AI descriptions: optional, user provides their own API key in settings
- Export: generated client-side (no server rendering)
- No auth, no database, no hosting, no Docker

## Features

| Feature | Description |
|---------|-------------|
| **Record** | Click the extension, perform your workflow. Every click/input auto-captures a screenshot with the element highlighted and a description generated. rrweb DOM recording runs alongside for video-like playback. |
| **Edit** | Side panel UI to reorder steps, rename titles, edit descriptions, blur sensitive areas on screenshots, delete steps. |
| **Replay** | Open a saved guide and hit replay. The extension walks through each step on the live page — finds elements, clicks/types for you, advances automatically. |
| **Export** | Download as self-contained HTML (offline), Markdown (for docs/wikis/repos), or PDF. All generated client-side. |
| **Settings** | Optional AI API key (OpenAI/Anthropic) for auto-generated step descriptions. Tool works without it. |
| **Storage** | All guides saved locally in IndexedDB. No account, no server, no data leaves the browser. |

## Not in Scope (v1)

- Backend / server of any kind
- User accounts / auth
- Team collaboration
- Sharing via URL
- Embed system
- Voice transcription
- Integrations (Notion, Slack, etc.)
- PII auto-redaction (can add in v2, it's client-side)

## Tech Stack

- **Extension:** Chrome Manifest V3, TypeScript
- **UI:** React (side panel)
- **State management:** XState (workflow/capture state machine)
- **Session recording:** rrweb
- **Storage:** IndexedDB via Dexie.js
- **Export:** jsPDF (PDF), client-side HTML/Markdown generation
- **AI (optional):** Direct API calls to OpenAI/Anthropic from the extension

## Key Technical Details

- **Screenshot capture** uses `chrome.tabs.captureVisibleTab` (Chrome API)
- **Step detection** tracks DOM elements via selectors and scoring, classifies actions (click/input/scroll)
- **Auto-titles** read element text, aria labels, and alt attributes
- **Workflow engine** is an XState state machine managing capture lifecycle, guidance, and replay
- **Replay** finds elements on live pages, executes click/type/scroll actions, advances through steps
- **rrweb** records DOM mutations for video-like session playback

## Differentiators vs Competitors

- **No account required** — install and use immediately
- **No data leaves the browser** — screenshots and guides stored locally
- **No limits** — unlimited guides, no watermarks, no per-seat pricing
- **True offline exports** — self-contained HTML with base64 embedded screenshots
- **Markdown export** — git-friendly, store guides alongside code in your repo
- **Replay** — automated workflow replay from saved guides
- **Open source, MIT licensed**
