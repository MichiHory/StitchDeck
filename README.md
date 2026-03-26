# StitchDeck

A web utility for merging files into a single output optimized for LLMs (Claude, GPT, Gemini). Upload files via drag & drop or sync from GitHub, reorder them, add custom text blocks, and export merged content in LLM-friendly XML format.

## Prerequisites

- **Node.js** >= 18 (tested on 22.x)
- **npm** >= 9

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (default http://localhost:5173)
npm run dev

# Type-check & build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **Vite 8** (Rolldown) + **TypeScript** (strict mode, ES2020 target)
- **highlight.js** — syntax highlighting in merged output
- **pdf-lib** — PDF merge / creation
- **pdfjs-dist** — PDF text extraction
- **tokenx** — LLM token counting
- No framework — vanilla TypeScript with IndexedDB persistence

## Key Features

- Project management with IndexedDB persistence
- Drag & drop file upload with full path capture
- Three view modes: list, tiles, tree
- Custom text entries mixed with files
- LLM-optimized XML output with file map
- Export compression (comment stripping, whitespace reduction)
- Security scan for secrets before merging
- GitHub integration (branch selection, .gitignore support, batch sync)
- PDF processing (text extraction, merge, conversion)
- Project export/import with optional AES-256-GCM encryption (.sdeck format)
- Light/dark theme, EN/CS localization

## Project Structure

```
src/
  main.ts          — entry point
  styles/main.css  — all styles
  db.ts            — IndexedDB operations
  state.ts         — shared app state
  i18n.ts          — translations (EN/CS)
  projects.ts      — project CRUD
  file-list.ts     — file list rendering & reorder
  merge.ts         — merging, copy, download
  github.ts        — GitHub API integration
  export-import.ts — .sdeck export/import
  pdf.ts           — PDF utilities
  help.ts          — help page with markdown parser
  docs/en.md       — English documentation
  docs/cs.md       — Czech documentation
```