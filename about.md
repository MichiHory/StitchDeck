A utility for merging files for LLMs. The utility can:

## Project Management

* Manage projects in the left panel
  - Create new projects via a modal dialog
  - Switch between projects by clicking on the name (if help is open, clicking on a project closes it and displays the selected project)
  - Rename projects inline (pencil icon on hover)
  - Delete projects with a confirmation dialog (✕ icon on hover) — the last project can also be deleted
  - Projects sorted alphabetically by locale
* If there are no projects, the main content displays a placeholder with a "New Project" button in the center of the screen
* Persistently store data in IndexedDB — files survive browser closing
* Automatically restore the last active project on startup (saved in localStorage)
* On first launch, a default project is automatically created ("Default project" / "Výchozí projekt" depending on language)

## Project Export and Import

* Export projects to a compressed file (.sdeck format)
  - Modal dialog for selecting projects to export (all or selected)
  - "Select all" checkbox with indeterminate state
  - Optional password for file encryption (AES-256-GCM with PBKDF2 key derivation)
  - Without a password the file is only compressed (gzip), with a password it is also encrypted
  - File downloaded as `stitchdeck-export.sdeck`
* Import projects from an .sdeck file
  - Automatic detection of encrypted files — prompts for password
  - Detection of duplicate project names with a dialog for choosing an action:
    - Overwrite existing project
    - Rename imported project (pre-filled name with "(imported)" suffix, user can manually edit)
    - Create project with duplicate name
    - Skip
  - Error messages displayed as stacked toast notifications (multiple errors visible at once)
* Export/Import buttons in the sidebar header next to the new project button — compact icon buttons
* Binary .sdeck format: magic bytes "SDCK" + version + encryption flag + [salt + iv + encrypted data] or [compressed data]
* Uses native Web Crypto API (PBKDF2, AES-GCM) and CompressionStream/DecompressionStream — no external dependencies
* Full i18n support (EN/CS)

## File Upload

* Upload files via drag & drop
  - Drop zone is displayed over the entire main content area when the project has no files
  - After adding files, dragging shows an overlay over the entire visible main-content area with fixed positioning (does not grow with content)
  - Drop zone has a dashed border and inset glow effect on hover/dragover
* Capture complete file paths via a hidden textarea on drag
  - Uses `webkitRelativePath` to preserve directory structure
  - Falls back to the file name alone if relative path is unavailable
  - Cleans paths by removing the `file://` prefix and decoding URI components

## File List

* File list view toggle — list, tiles, and tree modes with a toggle in the toolbar above the list
  - **List**: displays order number, drag handle (⋮), file icon with colored extension badge, file name, path, metadata (size, line count) and remove button
  - **Tiles**: grid layout (auto-fill, min 170px), compactly displays icon, file name (truncated if it doesn't fit), shortened path (direction: rtl — shows end of path), size and lines/PDF indicator
  - **Tree**: hierarchical file display grouped by directory structure with expandable/collapsible folders; folders sorted alphabetically before files; files display order number, icon, name, metadata and remove button; collapse/expand state persists between re-renders; custom texts displayed at root level; drag & drop reorder works on individual files; clicking the order number shows an inline input for manual position setting (Enter confirms, Escape cancels, blur confirms)
  - Numbering and drag & drop reorder work in all modes
  - Default view mode is tiles
  - View mode preference is saved to localStorage
* Tooltip system in tiles mode
  - Full path shown as tooltip on hover after 1 second
  - Tooltip intelligently repositions to stay within viewport
  - Tooltip is suppressed during dragging
* Color-coded file types in the list by extension
  - HTML/XML/Latte: red/orange tones
  - JavaScript/TypeScript: yellow/blue tones
  - PHP: purple
  - JSON/YAML: gray/red tones
  - CSS/SCSS/LESS: blue tones
  - Fallback: green
* Reorder files by dragging in the list (drag & drop reorder)
  - Dragged file has reduced opacity (35%) and 98% scale
  - Drop target is highlighted with accent color
  - After reordering, automatically saved to IndexedDB
* Remove individual files with the ✕ button (appears smoothly on hover)
* Lazy loading of file contents
  - Files are not read into text immediately on upload
  - `content` field is null, File object stored in `_file`
  - Unread files are converted to text when persisting the project

## Custom Texts

* Add custom text entries among files using the purple "Add text" button in the toolbar
* Modal dialog for creating and editing custom texts
  - Title (required, with validation and error message when empty)
  - Position (number 1–N, default 1 for new, current position for editing)
  - Textarea for content (optional)
  - Toggle "Include title in export" (enabled by default)
* Displayed in the list alongside files with purple color distinction (border, icon, title)
  - In list mode: shows title instead of file name and content preview instead of path
  - In tiles mode: same layout with purple pencil icon
* Edit by clicking the purple pencil icon (highlights and enlarges on hover) or double-clicking the entire tile
* When merged, they behave as .md files (plaintext, no syntax highlighting)
* Custom text titles are highlighted in purple (#a78bfa) in the output
* Support drag & drop ordering together with other files
* Persistently saved to IndexedDB as part of the project

## Merging and Output

* Merge all files into a single text output in `path:\ncontent` format
* Output control toggles (with localStorage persistence)
  - Enable/disable file path insertion (disabled by default)
  - Trim empty lines at the beginning and end of each file's content (disabled by default)
  - LLM-optimized format (enabled by default) — adds `<file_map>` with a numbered file list at the beginning and wraps each file's content in `<file path="...">...</file>` XML tags (inspired by Repomix format, optimal for Claude, GPT and Gemini)
  - "Include file paths" and "LLM-optimized format" toggles are mutually exclusive — enabling one automatically disables the other; on initialization, LLM format takes priority
  - Export compression for LLM (disabled by default) — removes comments (line and block for C-style, hash, HTML and SQL languages), collapses consecutive blank lines, reduces indentation (4 spaces→2, tabs→2 spaces, except Python), trims trailing whitespace; markdown and plaintext only collapse blank lines (comments are content)
  - Security scan before merging (enabled by default) — before merging, scans file contents and detects potential secret keys, tokens, passwords, private keys, connection strings and other sensitive data; on detection shows a modal warning with a findings table (file, line, type, detail, masked match) and a checkbox for each finding to choose replacement; checked secrets are replaced with a random string in the output, unchecked ones remain; "select all" checkbox in the header; source files are not modified — replacements apply only to the output; user can also cancel the merge
  - PDF to text conversion — shown only if there is at least one PDF file in the list (enabled by default)
* Merged output display
  - Line numbering (numbers are not part of the text — cannot be copied, not in selection)
  - Limited to 20,000 lines with a truncation warning
  - Syntax highlighting by file type
* Syntax highlighting
  - Supported languages: HTML/HTM, XML/SVG, JS/MJS/CJS, TS, TSX/JSX, PHP, JSON, YAML/YML, NEON, Latte, Blade, Vue, Svelte, CSS/SCSS/LESS, Python, Ruby, Java, C, C++, C#, Go, Rust, Swift, Kotlin, Scala, Perl, R, Bash/Shell/Zsh, SQL, Lua, Dart, Haskell, Objective-C, Groovy/Gradle, PowerShell, Dockerfile, INI/TOML/conf, Markdown
  - Language is detected from the extension in each section's header
  - File names highlighted in neon green (#27db0f)
  - Highlighting is purely visual — not part of copied or downloaded text
  - Uses the highlight.js library
* Output metadata — displays file count, line count, size and estimated token count for LLM (tokenx library)

## Copying and Downloading

* Copy merged content to clipboard (without line numbers and without syntax highlighting)
  - Uses native Clipboard API (`navigator.clipboard.writeText`)
  - If copying fails, a warning is displayed
* Download merged content as a text file
  - Modal dialog for choosing file name and format
  - Supported formats: txt, md, json, xml, csv, html, log
  - Default name `merged-files`, default format `.txt`
  - MIME types set accordingly
* Download as PDF ("Download PDF" button shown if there is at least one PDF file in the list)
  - If all files are PDFs, they are merged into a single PDF (copies all pages)
  - If there are also text files in the list, content is converted to PDF pages (Courier, A4, automatic line wrapping, auto-pagination)
  - Unsupported characters are replaced with a question mark
  - Uses the pdf-lib library

## PDF Processing

* Automatic detection of PDF files in the list (by `.pdf` extension)
* Binary data stored as a base64 string in the `pdfData` field
* Text extraction from PDF (using pdfjs-dist)
  - Sorts text elements by visual position (Y top to bottom, X left to right)
  - Groups elements into lines based on font height
  - Inserts spaces/tabs based on horizontal distances between elements
  - Multi-page documents joined with blank lines between pages
* When the "Convert PDF to text" toggle is off, a placeholder `[PDF – binary content]` is displayed

## GitHub Integration

* "GitHub" button in the toolbar opens a modal dialog for connection settings
* Connection settings
  - Repository: owner/repo or full URL (automatically strips `.git` suffix)
  - Optional access token for private repositories
  - Branch selection with the ability to load branch list from the API (displayed as clickable chips)
* Exclude rules via repository tree structure
  - Loaded via the "Load folders" button from GitHub API (Trees API with recursive=1)
  - Displays directories and files (directories sorted first, files with colored icons by extension)
  - Tree structure has visual guide lines
  - Names preserve original casing from the repository
  - Checked items have strikethrough text
  - Clicking the arrow expands/collapses a directory without checking the checkbox
  - Cascading parent/child checking and indeterminate state
* .gitignore support
  - Parses all .gitignore files in the repository and respects their rules
  - Supports `**`, `*`, `?`, `/` anchoring, directory-only patterns (trailing `/`), negation (`!`), character classes (`[abc]`), escaped characters (`\#`, `\!`, `\ `), automatic anchoring of patterns containing `/`
  - Custom excludes are applied on top of .gitignore rules
* Automatic skipping of binary files (images, fonts, archives, executables, etc.)
* Modal dialog has three buttons: Cancel, Save (saves without syncing), Save & sync / Connect & sync (saves and performs sync)
* Status bar after connection
  - Displayed below the toolbar with the GitHub logo, repository name and current branch
  - Buttons: sync (updates files), settings (opens dialog with pre-filled values), disconnect
  - When switching projects, updates according to the saved GitHub connection of that project
* Synchronization
  - Files are downloaded via raw.githubusercontent.com in batches of 10 for optimal performance
  - Replaces only files with `source: 'github'` with new ones from GitHub
  - Manually added files (`source: 'manual'`) and custom texts remain in their positions including order
  - If manual file positions would exceed the total item count after sync, they are automatically recalculated
  - Sync progress shows a modal window with a progress bar and status information
* GitHub connection settings are saved to IndexedDB as part of the project (interface GitHubConfig: owner, repo, branch, token, customExcludes)
* Full i18n support (EN/CS)

## Toolbar and Actions

* Toolbar with file list (view toggle, add text, GitHub) is always visible — even when the project has no files yet
* Clear all (files and output) with a single button — with a confirmation dialog

## Notifications and Modals

* Toast notifications for user feedback
  - Positioned at the bottom center in a container, pill shape with border and backdrop blur
  - Support for multiple toast notifications displayed simultaneously (stacking) — new ones appear above previous ones
  - Success actions: green accent background and text, ✓ prefix
  - Error actions: red accent background and text
  - Warning: neutral style
  - Auto-dismiss after 3.5 seconds (each toast independently)
* Modal windows for actions
  - Backdrop blur effect
  - Close by clicking the background or pressing ESC
  - Enter in input field confirms the action
  - Validation and error display support
  - `modal--large` variant for GitHub and custom text dialogs

## Animations

* Visual effect when updating an already uploaded file
  - Old box breaks apart into 18 green particles (particle burst) of various shades that fly outward with rotation (duration 350–600ms)
  - New box inflates like a bubble (grow-in animation): starts at 30% scale → 102% → 100%, duration 450ms with cubic-bezier easing
* Subtle transition animations overall 150ms cubic-bezier(.4,0,.2,1)

## Internationalization (i18n)

* Multi-language support with a switcher in the top bar
  - Default language English, available languages: EN, CS
  - Switcher buttons in the top right corner, active language highlighted with accent color
* Translation uses a dictionary system with `t(key, params)` function
  - Static HTML elements have `data-i18n` attributes, title attributes `data-i18n-title`
  - Parameter substitution `{paramName}` in translations
  - Fallback to English if translation is missing
* Language preference is saved to localStorage
* On language change, all UI texts are automatically re-rendered

## Help

* Help button in the sidebar footer with a question mark icon
* Clicking opens a documentation page that replaces the main content
* Direct link to help via `#help` in URL — allows sharing and direct access without clicking through the app
  - When opening help, URL updates to `#help` (via `history.pushState`)
  - When closing help, the hash is removed
  - When loading the page with `#help` in URL, help is automatically displayed
  - Browser back/forward navigation correctly toggles between help and the application
* Documentation stored in separate .md files for each language (`src/docs/en.md`, `src/docs/cs.md`) — easy to add more languages
* Simple markdown parser converts .md to HTML (h1–h3, paragraphs, lists, bold, inline code)
* Documentation contains sections: Getting Started, Projects, Adding Files, File List, Custom Texts, Merging and Export, GitHub Integration, Tips and Shortcuts
* Side navigation is always visible (fixed panel to the left of scrollable content)
* Active section is highlighted in navigation while scrolling
* "Back to app" button to return to the main view
* Responsive — on mobile, navigation is displayed above the content

## Light/Dark Mode

* Toggle in the top bar — button with sun (to switch to light) and moon (to switch to dark) icons
* Preference is saved to localStorage, default mode is dark
* Switching applies the `light` class to the `<html>` element with CSS variable overrides

## Design

* Dark and light theme with an elaborate color palette
  - Dark: black background (#09090b), surface levels (#131316, #1a1a1f, #222228), green accent (#22c55e)
  - Light: light background (#f5f5f7), white surfaces (#ffffff), darker green accent (#16a34a)
* Layout: flexbox, top bar + sidebar (260px, fixed viewport height, does not scroll with content) + main content
* Typography: Inter (UI text), JetBrains Mono (code, metadata)
* SVG icons in buttons instead of emoji — merge, download, copy, upload icons
* Logo in the top bar with a gradient green background and stylized letter S
* Buttons with SVG icons inside `<span data-i18n>` for proper translation functionality
* Scrollbars — unified globally via CSS variables `--scroll-thumb`/`--scroll-thumb-hover`, well visible in both modes (dark and light)
* Files in the list with smooth remove button appearance on hover

## SEO Optimization

* Meta tags: description, keywords, author, robots, theme-color
* Open Graph tags (og:type, og:title, og:description, og:site_name, og:locale with cs_CZ alternative)
* Twitter Card tags (summary card with title and description)
* Structured Data (JSON-LD) — schema.org WebApplication with featureList and price (free)
* `<noscript>` block with full text description of the app and features for search engines that don't execute JS
* Dynamic `lang` attribute on `<html>` — set on initialization and on language switch
* `robots.txt` in `public/` allowing indexing
* Optimized `<title>` with keywords (StitchDeck — Merge Files for LLM | AI-Optimized File Merger)

## Technical Stack

* **Build**: Vite 8 (Rolldown) + TypeScript (strict mode, ES2020 target)
* **Dependencies**: highlight.js (syntax highlighting), pdf-lib (PDF operations), pdfjs-dist (PDF text extraction), tokenx (token counting), GitHub REST API (repository fetching, no external libraries)
* **Project structure**:
  - `index.html` — HTML template
  - `src/main.ts` — entry point, initialization of all systems
  - `src/styles/main.css` — all styles
  - `src/i18n.ts` — translations and i18n functions
  - `src/db.ts` — IndexedDB operations, types (FileEntry, Project, GitHubConfig)
  - `src/state.ts` — shared application state (files, fullMergedContent, dragSrcIndex, renderGeneration, currentProjectId, saveTimeout, viewMode)
  - `src/dom.ts` — DOM element references
  - `src/helpers.ts` — utility functions (escapeHtml, formatSize, countTokens, formatTokens, cleanPath, readFile, getExtColor, getLanguage)
  - `src/toast.ts` — toast notifications
  - `src/modal.ts` — modal dialogs (generic component with validation)
  - `src/animations.ts` — particle burst and grow-in animations
  - `src/projects.ts` — project management (CRUD, persistence, switching)
  - `src/export-import.ts` — project export and import (compression, encryption, UI dialogs, duplicate handling)
  - `src/file-list.ts` — file list rendering, drag & drop reorder, custom text dialogs
  - `src/dropzone.ts` — drag & drop file upload
  - `src/merge.ts` — merging, copying, downloading (text and PDF), clear all
  - `src/pdf.ts` — PDF binary conversion utilities
  - `src/github.ts` — GitHub API integration (repository fetching, .gitignore parsing, synchronization, tree structure)
  - `src/github-init.ts` — GitHub UI event initialization (buttons, disconnect)
  - `src/lang-switcher.ts` — language switcher
  - `src/theme-toggle.ts` — light/dark mode toggle
  - `src/help.ts` — help page with markdown parser and navigation
  - `src/docs/en.md` — documentation in English
  - `src/docs/cs.md` — documentation in Czech
  - `public/robots.txt` — robots.txt for search engines

## Persistence

* **IndexedDB** (database `stitchdeck`, version 1, object store `projects`)
  - Stores projects with files and GitHub configuration
  - Operations: getAllProjects, getProject, saveProject, deleteProjectFromDB
* **localStorage** keys:
  - `stitchdeck_viewMode` — view mode (list/tiles/tree)
  - `stitchdeck_togglePaths` — path insertion in output
  - `stitchdeck_toggleTrimEmpty` — trimming empty lines
  - `stitchdeck_togglePdfToText` — PDF text extraction
  - `stitchdeck_toggleCompress` — export compression for LLM
  - `stitchdeck_toggleSecurityScan` — security scan before merging
  - `stitchdeck_toggleFileMap` — file map insertion at the beginning
  - `stitchdeck_lang` — language (en/cs)
  - `stitchdeck_theme` — theme (dark/light)
  - `stitchdeck_activeProject` — ID of the last active project