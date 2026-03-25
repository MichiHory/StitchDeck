# StitchDeck Documentation
Complete guide to using StitchDeck — the file merger utility for LLM.

## Getting Started

StitchDeck is a browser-based utility for merging multiple source files into a single text output, optimized for use with large language models (LLMs) such as ChatGPT, Claude, or Gemini. The entire application runs locally in your browser — no data is sent to any server. Your files never leave your computer.

### Quick start

- Create or select a project in the left panel
- Drag and drop files into the main area
- Optionally add custom texts with instructions for the AI
- Rearrange files by dragging them into the desired order
- Click **Merge files** to generate the output
- Copy the output to clipboard or download it as a file

All data is stored locally in your browser's IndexedDB and persists even after closing the tab. You can safely close the browser and return to your work later — everything will be exactly as you left it.

### What is it for?

When working with AI models, you often need to share multiple source files as context. Copying them one by one is tedious and error-prone. StitchDeck merges all your files into a single, well-structured text that AI models can process efficiently. The LLM-optimized format includes a file map and XML tags that help the model understand the structure of your codebase.

## Projects

StitchDeck organizes your work into projects. Each project contains its own set of files, custom texts, and GitHub configuration. This allows you to maintain separate contexts for different tasks or repositories.

### Creating a project

Click the **+** button in the projects panel header. A dialog will appear where you enter the project name. Press **Enter** or click **Create** to confirm.

### Switching projects

Click a project name in the list. The current project is saved automatically before switching, so you never lose your work. The last active project is remembered and restored when you reopen the application.

### Renaming and deleting

- Hover over a project to reveal the rename (pencil) and delete (cross) icons
- Click the pencil icon to open a rename dialog with the current name pre-filled
- Click the cross icon to delete — a confirmation dialog will appear
- You can delete all projects, including the last one — when no projects exist, the main area shows a centered **New project** button

Projects are sorted alphabetically according to your language settings.

### Export and import

You can export your projects to a compressed `.sdeck` file and import them back — useful for backups, transferring projects between browsers, or sharing with colleagues.

**Export:**

- Click the **export** icon button in the projects panel header (arrow up icon, next to the + button)
- A dialog appears with checkboxes for all projects — select which to export, or use **Select all**
- Optionally set a **password** to encrypt the file (minimum 6 characters) — the file is encrypted with AES-256-GCM using PBKDF2 key derivation (600,000 iterations). Without a password, the file is only compressed.
- Click **Export** to download the `.sdeck` file

**Import:**

- Click the **import** icon button in the projects panel header (arrow down icon)
- Select a `.sdeck` file — if it's password-protected, you'll be prompted for the password
- If any imported project names already exist, a dialog appears for each duplicate with options:
  - **Rename** — a text input appears with a suggested name (e.g. "My project (imported)") that you can edit freely
  - **Overwrite** — replaces the existing project
  - **Create duplicate** — imports with the same name alongside the existing project
  - **Skip** — don't import this project
- Errors during import are displayed as stacked toast notifications so all messages are visible at once

## Adding Files

Add files to your project by dragging and dropping them onto the main content area.

### Drag & drop

- Drag files or folders from your file explorer into the main content area
- When the project is empty, a large drop zone with an upload icon is displayed — drop your files anywhere inside it
- When the project already has files, a semi-transparent overlay appears over the content area when you start dragging

### File paths

StitchDeck captures full file paths including directory structure using `webkitRelativePath`. This means that when you drag a folder, the relative paths within that folder are preserved. If the relative path is unavailable (e.g. when dragging individual files), only the file name is used.

### Updating files

If you drop a file with the same name and path as an existing one, it will be updated in place. You'll see a visual effect — the old file "bursts" into particles and the new one appears with a grow-in animation. This is useful when you've made changes to a file and want to update it in your project.

### Lazy loading

File contents are not read immediately when you add them. The actual content is loaded only when needed (e.g. during merge or when saving to IndexedDB). This keeps the interface responsive even when adding many large files.

## File List

The file list shows all files in the current project. You can switch between three display modes using the toggle buttons in the toolbar above the list.

### Display modes

- **List** — compact view showing order number, drag handle, file icon with colored extension badge, file name, path, metadata (size, line count), and a remove button
- **Tiles** — grid layout with auto-fill columns (minimum 170px wide), showing icon, truncated file name, shortened path (right-to-left so the end of the path is visible), size, and line/PDF indicator
- **Tree** — hierarchical view grouped by directory structure with collapsible folders; folders are sorted alphabetically before files; individual files show order number, icon, name, metadata, and remove button

Your display mode preference is saved and restored automatically.

### Drag & drop reorder

In all modes you can reorder files by dragging. Grab the drag handle (in list mode) or the entire tile/row and drop it at the desired position. The drop target is highlighted with the accent color. The order determines the sequence of files in the merged output, so arrange them in the order that makes most sense for the AI.

### Reorder by number

In list and tree mode, click the file's order number to open an inline input where you can type a new position directly. Press **Enter** or click away to confirm, or press **Escape** to cancel.

### Color coding

Files have colored icons by extension to help you quickly identify file types:

- **Red/orange** — HTML, XML, Latte, Blade
- **Yellow/blue** — JavaScript, TypeScript, JSX, TSX
- **Purple** — PHP
- **Grey/red** — JSON, YAML, NEON
- **Blue** — CSS, SCSS, LESS
- **Green** — fallback for other types

### Removing files

Hover over a file to reveal the remove button (cross icon). Click it to remove the file from the project. There is no confirmation — the removal is instant, but you can always re-add the file by dragging it in again.

### Tooltip in tiles mode

In tiles mode, hover over a file for 1 second to see its full path as a tooltip. The tooltip automatically repositions itself so it doesn't overflow the viewport.

## Custom Texts

Custom texts allow you to insert your own notes, instructions, or context between files in the merged output. This is particularly useful for adding AI prompts, explanations, or structuring your output into logical sections.

### Creating a custom text

- Click the **Add text** button (purple) in the toolbar
- Enter a **title** (required) — this serves as the heading in the output
- Optionally write **content** in the textarea
- Set the **position** where the text should appear among the files (default is position 1, i.e. at the beginning)
- Toggle **Include title in export** to control whether the title appears as a heading in the merged output (enabled by default)

### Editing

Click the purple pencil icon on the custom text entry, or double-click the entire tile/row to open the edit dialog. The dialog is pre-filled with the current values.

### Display in output

Custom texts behave like .md files in the merged output. Their titles are highlighted in purple in the output view. They support drag & drop reordering alongside regular files, so you can place them exactly where you need them.

## Merging & Export

StitchDeck merges all files and custom texts into a single output that you can copy or download. Click the **Merge files** button to generate the output.

### Merge options

All options are saved as preferences and restored on next visit:

- **Include file paths** — adds the file path as a plain text header for each section. Mutually exclusive with LLM-optimized format.
- **Trim empty lines** — removes empty lines at the start and end of each file's content, keeping the output clean
- **LLM-optimized format** — adds a `<file_map>` with a numbered list of all files at the beginning, and wraps each file's content in `<file path="...">...</file>` XML tags. This format is inspired by Repomix and is optimal for Claude, GPT, and Gemini. Mutually exclusive with plain file paths.
- **Compress export** — reduces token count by removing comments (line and block comments for C-style, hash, HTML, and SQL languages), collapsing consecutive empty lines, reducing indentation (4 spaces to 2, tabs to 2 spaces — except Python), and trimming trailing whitespace. Markdown and plaintext files only get empty line collapsing (comments are content).
- **Security scan** — before merging, scans all file contents for potential secrets: API keys, tokens, passwords, private keys, connection strings, and other sensitive data. If issues are found, a warning dialog shows a table of findings (file, line, type, detail, masked match). You can choose to ignore the warnings and proceed, or cancel the merge.
- **Convert PDF to text** — visible only when the list contains at least one PDF file. Extracts text from PDF pages sorted by visual position. When disabled, PDF files show a placeholder `[PDF – binary content]`.

### Output

- Line numbers are displayed on the left side — they are purely visual and not included when you copy or download the text
- Syntax highlighting is applied based on file extension, supporting 30+ languages including HTML, JavaScript, TypeScript, PHP, Python, Go, Rust, and many more
- Display is limited to 20,000 lines. If the output exceeds this limit, a warning is shown and you should download the file for full content
- Metadata below the header shows file count, line count, size, and estimated token count (using the tokenx library)

### Copy and download

- **Copy** — copies plain text without line numbers and without syntax highlighting to clipboard using the native Clipboard API
- **Download** — opens a dialog where you choose the file name and format (txt, md, json, xml, csv, html, log). MIME types are set correctly for each format.
- **Download PDF** — visible only when the list contains PDF files. If all files are PDFs, they are merged into a single PDF document. If there's a mix of text and PDF files, the text content is also converted to PDF pages (Courier font, A4 size, automatic line wrapping and pagination).

## GitHub Integration

Connect your project to a GitHub repository to automatically import and synchronize files. This lets you quickly pull source code without cloning the repository.

### Connecting a repository

- Click the **GitHub** button in the toolbar to open the setup dialog
- Enter the repository as `owner/repo` or paste a full GitHub URL (the `.git` suffix is automatically stripped)
- For private repositories, enter a personal access token in the **Access token** field
- Select a **branch** — you can click **Load branches** to fetch the list of available branches from the API, which will appear as clickable chips
- Optionally click **Load folders** to fetch the repository's tree structure for configuring exclusions
- Click **Connect & sync** to save the configuration and immediately sync files

### Excluding files

- StitchDeck automatically parses and respects all `.gitignore` files in the repository, supporting patterns like `**`, `*`, `?`, `/` anchoring, directory-only patterns (trailing `/`), negation (`!`), character classes (`[abc]`), and escaped characters
- You can check additional folders and files to exclude in the interactive tree structure — checked items appear with strikethrough text
- Clicking the arrow expands/collapses a directory without toggling the checkbox; parent/child checkboxes cascade and show an indeterminate state when partially checked
- Binary files (images, fonts, archives, executables, etc.) are automatically skipped regardless of settings

### Synchronization

- After connecting, a status bar appears below the toolbar showing the GitHub logo, repository name, and current branch
- The status bar has three buttons: **Sync** (refresh files), **Settings** (open the dialog with pre-filled values), and **Disconnect**
- During sync, only files marked with `source: 'github'` are replaced with fresh versions from GitHub
- Manually added files (`source: 'manual'`) and custom texts remain at their positions and order
- If manual file positions would exceed the total count after sync, they are automatically recalculated
- Files are downloaded via `raw.githubusercontent.com` in batches of 10 for optimal performance
- A progress dialog shows the current state (fetching tree, parsing .gitignore, downloading files with progress counter)
- GitHub configuration is saved as part of the project in IndexedDB

### Disconnecting

Click the disconnect button (cross icon) in the status bar. A confirmation dialog will appear. Files that were synced from GitHub will remain in the project — only the connection is removed.

## Tips & Shortcuts

Tips and keyboard shortcuts to work more efficiently with StitchDeck.

### Keyboard shortcuts

- `Esc` — closes any modal dialog
- `Enter` — confirms action in a modal dialog (e.g. creating a project, renaming)

### Tips for efficient work

- Use the **LLM-optimized format** for best results with AI models — the file map at the beginning gives the model an overview of all files before it reads the content
- Enable **export compression** if you need to reduce token count — this is especially useful for large codebases where comments and whitespace add up
- Insert a **custom text** at position 1 with instructions for the AI (e.g., "Analyze this code and find potential bugs" or "Refactor the following code to improve readability")
- Keep the **security scan** enabled — it protects against accidentally sharing API keys, database passwords, and other secrets with AI services
- Connect a project to **GitHub** for quick file import from a repository — you can exclude folders like `node_modules`, `dist`, or `.env` directly in the tree structure
- Use the **tree view** mode when working with many files from a deep directory structure — it makes it easier to understand the project layout
- The **tiles view** is great for quick visual scanning of file types thanks to the colored extension badges

### Data storage

StitchDeck stores all data locally in your browser:

- **IndexedDB** — project data including files, custom texts, and GitHub configuration
- **localStorage** — user preferences (display mode, language, theme, merge options)

No data is ever sent to any external server. Clearing your browser data will remove all projects and settings.

### Browser support

StitchDeck works in all modern browsers — Chrome, Firefox, Safari, and Edge. It requires JavaScript to be enabled and uses modern browser APIs (IndexedDB, Clipboard API, Drag & Drop API, Web Crypto API, CompressionStream).