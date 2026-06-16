import { state } from './state';
import type { FileEntry } from './db';
import { generateId } from './db';
import { cleanPath, readFile, escapeHtml, formatSize, isBinaryFile } from './helpers';
import { t } from './i18n';
import { toast, persistentToast } from './toast';
import { showModal } from './modal';
import { renderFileList } from './file-list';
import { scheduleSave } from './projects';
import { burstAndRegrow } from './animations';
import { readFileAsArrayBuffer, arrayBufferToBase64 } from './pdf';
import {
    dropzone, fileListEl, fileListWrapper,
    mainContentEl, mainContentDropOverlay, pathCapture,
} from './dom';

/** A file ready to be imported, with its resolved path already decided. */
interface PendingFile {
    file: File;
    path: string;
}

// Directories/files that are never imported nor offered when a folder is dropped.
const HARD_SKIP_DIRS = new Set(['.git', 'node_modules']);
const HARD_SKIP_FILES = new Set(['.DS_Store']);

function isHardSkipped(relPath: string): boolean {
    const parts = relPath.split('/');
    if (HARD_SKIP_FILES.has(parts[parts.length - 1])) return true;
    return parts.some(p => HARD_SKIP_DIRS.has(p));
}

function handleDrop(e: DragEvent): void {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    fileListWrapper.classList.remove('drag-active');

    const dt = e.dataTransfer!;

    // Read all path hints synchronously — the DataTransfer is invalidated once
    // this handler returns, so nothing below may run after an await.
    const textData = dt.getData('text') || dt.getData('text/uri-list') || '';
    const pathLines = textData.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const textareaLines = pathCapture.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    pathCapture.value = '';

    const droppedFiles = dt.files;

    // Collect filesystem entries synchronously as well — webkitGetAsEntry() is the
    // only way to expand a dropped folder, and it is only valid during the event.
    const items = dt.items ? Array.from(dt.items) : [];
    const entries = items
        .map(it => (typeof it.webkitGetAsEntry === 'function' ? it.webkitGetAsEntry() : null))
        .filter((en): en is FileSystemEntry => en != null);

    const hasDirectory = entries.some(en => en.isDirectory);

    if (!hasDirectory) {
        // No folders involved → preserve the original file-only behavior exactly.
        if (!droppedFiles.length) return;
        const capturedPaths = pathLines.length >= droppedFiles.length ? pathLines : textareaLines;
        void handleFilesWithPaths(droppedFiles, capturedPaths);
        return;
    }

    const capturedLines = pathLines.length ? pathLines : textareaLines;
    void handleDroppedEntries(entries, capturedLines);
}

/** Path resolution + import for plain file drops (no folders) — unchanged behavior. */
async function handleFilesWithPaths(fileList: FileList, capturedPaths: string[]): Promise<void> {
    const pending: PendingFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        let path = f.webkitRelativePath || f.name;

        if (capturedPaths.length > 0) {
            if (capturedPaths.length === fileList.length) {
                const candidate = cleanPath(capturedPaths[i]);
                if (candidate && candidate.toLowerCase().endsWith(f.name.toLowerCase())) {
                    path = candidate;
                }
            } else {
                const match = capturedPaths.find(p =>
                    cleanPath(p).toLowerCase().endsWith(f.name.toLowerCase())
                );
                if (match) {
                    path = cleanPath(match);
                    capturedPaths = capturedPaths.filter(p => p !== match);
                }
            }
        }

        pending.push({ file: f, path });
    }

    await importFiles(pending);
}

/* ── Folder drag & drop ── */

function readEntryFile(fileEntry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve, reject) => fileEntry.file(resolve, reject));
}

function readDirectory(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

/** Recursively gather every file inside a dropped directory (hard-skipped paths excluded). */
async function collectFolderFiles(
    dirEntry: FileSystemDirectoryEntry,
    out: { file: File; relPath: string }[],
): Promise<void> {
    const reader = dirEntry.createReader();
    // readEntries() returns results in batches; keep calling until it returns none.
    let batch = await readDirectory(reader);
    while (batch.length > 0) {
        for (const en of batch) {
            const relPath = en.fullPath.replace(/^\/+/, '');
            if (isHardSkipped(relPath)) continue;
            if (en.isFile) {
                try {
                    const file = await readEntryFile(en as FileSystemFileEntry);
                    out.push({ file, relPath });
                } catch { /* skip unreadable file */ }
            } else if (en.isDirectory) {
                await collectFolderFiles(en as FileSystemDirectoryEntry, out);
            }
        }
        batch = await readDirectory(reader);
    }
}

/**
 * Find the parent directory of a dropped top-level folder from the captured
 * absolute paths, so a file's absolute path can be reconstructed as
 * `parent + '/' + fullPath`. Returns null when no captured path matches.
 */
function findCapturedBase(dirName: string, capturedLines: string[]): string | null {
    for (const line of capturedLines) {
        const clean = cleanPath(line).replace(/\\/g, '/').replace(/\/+$/, '');
        const base = clean.split('/').pop() || '';
        if (base.toLowerCase() === dirName.toLowerCase()) {
            return clean.slice(0, clean.length - base.length).replace(/\/+$/, '');
        }
    }
    return null;
}

function joinPath(base: string, rel: string): string {
    if (!base) return rel;
    return base.replace(/\/+$/, '') + '/' + rel.replace(/^\/+/, '');
}

async function handleDroppedEntries(entries: FileSystemEntry[], capturedLines: string[]): Promise<void> {
    let closeToast: (() => void) | null = persistentToast(t('folderImporting'));
    const stopToast = () => { if (closeToast) { closeToast(); closeToast = null; } };

    try {
        const loose: { file: File; name: string }[] = [];
        const folderFiles: { file: File; path: string }[] = [];
        let usedRelative = false;

        for (const en of entries) {
            if (en.isFile) {
                try {
                    loose.push({ file: await readEntryFile(en as FileSystemFileEntry), name: en.name });
                } catch { /* skip unreadable file */ }
            } else if (en.isDirectory) {
                if (isHardSkipped(en.name)) continue;
                const collected: { file: File; relPath: string }[] = [];
                await collectFolderFiles(en as FileSystemDirectoryEntry, collected);
                const base = findCapturedBase(en.name, capturedLines);
                if (base === null) usedRelative = true;
                for (const c of collected) {
                    folderFiles.push({ file: c.file, path: base !== null ? joinPath(base, c.relPath) : c.relPath });
                }
            }
        }

        // Deterministic order for folder-derived files.
        folderFiles.sort((a, b) => a.path.localeCompare(b.path));

        // Loose top-level files keep the original drag & drop behavior: resolved
        // absolute path when captured, read as text/PDF, never offered as binary.
        const loosePending: PendingFile[] = loose.map(({ file, name }) => {
            const match = capturedLines.find(p =>
                cleanPath(p).replace(/\\/g, '/').toLowerCase().endsWith(name.toLowerCase())
            );
            return { file, path: match ? cleanPath(match).replace(/\\/g, '/') : name };
        });

        // Categorize folder contents: clean (text + PDF) auto-import, binaries need confirmation.
        const cleanFolder: PendingFile[] = [];
        const binaries: PendingFile[] = [];
        for (const ff of folderFiles) {
            const isPdf = ff.file.name.toLowerCase().endsWith('.pdf');
            if (isBinaryFile(ff.path) && !isPdf) binaries.push(ff);
            else cleanFolder.push(ff);
        }

        const pending: PendingFile[] = [...loosePending, ...cleanFolder];

        if (binaries.length) {
            stopToast(); // don't show "importing" while the user is deciding
            pending.push(...await askBinaries(binaries));
            if (pending.length) closeToast = persistentToast(t('folderImporting'));
        }

        if (!pending.length) {
            toast(t('nothingToImport'));
            return;
        }

        if (usedRelative) toast(t('folderRelativePaths'));

        await importFiles(pending, { quiet: true });
        toast(t('filesAdded', { count: String(pending.length) }), 'success');
    } finally {
        stopToast();
    }
}

/** Confirmation modal listing binary files; returns the ones the user chose to import. */
async function askBinaries(binaries: PendingFile[]): Promise<PendingFile[]> {
    const rows = binaries.map((b, i) => `
        <label style="display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:pointer">
            <input type="checkbox" data-bin-idx="${i}">
            <span style="flex:1;font-family:var(--mono,monospace);font-size:12px;word-break:break-all">${escapeHtml(b.path)}</span>
            <span style="opacity:.6;font-size:11px;white-space:nowrap">${escapeHtml(formatSize(b.file.size))}</span>
        </label>
    `).join('');

    const body = `
        <div style="margin-bottom:10px">${escapeHtml(t('binaryModalIntro'))}</div>
        <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;font-weight:600;border-bottom:1px solid var(--border,#333);cursor:pointer">
            <input type="checkbox" data-bin-all>
            <span>${escapeHtml(t('binarySelectAll'))}</span>
        </label>
        <div data-role="binary-list" style="max-height:320px;overflow:auto;margin-top:4px">${rows}</div>
    `;

    const result = await showModal({
        title: t('binaryModalTitle'),
        modalClass: 'modal--large',
        body,
        confirmText: t('binaryUploadSelected'),
        confirmClass: 'btn-primary',
        secondaryConfirmText: t('binaryUploadAll'),
        secondaryConfirmClass: 'btn-secondary',
        onMount: (overlay) => {
            const all = overlay.querySelector<HTMLInputElement>('[data-bin-all]')!;
            const boxes = Array.from(overlay.querySelectorAll<HTMLInputElement>('[data-bin-idx]'));
            all.addEventListener('change', () => boxes.forEach(b => { b.checked = all.checked; }));
            boxes.forEach(b => b.addEventListener('change', () => {
                all.checked = boxes.every(x => x.checked);
                all.indeterminate = !all.checked && boxes.some(x => x.checked);
            }));
        },
        resolveData: (overlay) => ({
            all: false,
            idxs: Array.from(overlay.querySelectorAll<HTMLInputElement>('[data-bin-idx]:checked'))
                .map(cb => Number(cb.dataset.binIdx)),
        }),
        resolveSecondaryData: () => ({ all: true, idxs: [] as number[] }),
    }) as { all: boolean; idxs: number[] } | null;

    if (!result) return [];
    if (result.all) return binaries;
    return result.idxs.map(i => binaries[i]).filter(Boolean);
}

/** Read content, apply override/update-in-place logic, animate and persist. */
async function importFiles(pending: PendingFile[], opts: { quiet?: boolean } = {}): Promise<void> {
    if (!pending.length) return;
    const updatedIndices: number[] = [];

    for (const { file: f, path } of pending) {
        const isPdf = f.name.toLowerCase().endsWith('.pdf');
        let content: string | null = null;
        let pdfData: string | undefined;
        if (isPdf) {
            const arrayBuf = await readFileAsArrayBuffer(f);
            pdfData = arrayBufferToBase64(arrayBuf);
        } else {
            content = await readFile(f);
        }

        const existingIndex = state.items.findIndex(item => !item.entry.isCustomText && item.entry.path === path);
        if (existingIndex !== -1) {
            const item = state.items[existingIndex];
            if (item.origin === 'inherited') {
                const entry: FileEntry = { id: generateId(), name: f.name, path, content, size: f.size, source: 'manual' };
                if (pdfData) entry.pdfData = pdfData;
                state.items[existingIndex] = { entry, origin: 'override', inheritedId: item.inheritedId, hidden: item.hidden };
                if (!opts.quiet) toast(t('overrideCreated', { name: f.name }), 'success');
            } else {
                const entry: FileEntry = { id: item.entry.id, name: f.name, path, content, size: f.size, source: 'manual' };
                if (pdfData) entry.pdfData = pdfData;
                state.items[existingIndex] = { ...item, entry };
                if (!opts.quiet) toast(t('updated', { name: f.name }), 'success');
            }
            updatedIndices.push(existingIndex);
        } else {
            const entry: FileEntry = { id: generateId(), name: f.name, path, content, size: f.size, source: 'manual' };
            if (pdfData) entry.pdfData = pdfData;
            state.items.push({ entry, origin: 'own', hidden: false });
        }
    }

    const burstRects: Record<number, DOMRect> = {};
    updatedIndices.forEach(idx => {
        const oldEl = fileListEl.querySelector<HTMLElement>(`[data-index="${idx}"]`);
        if (oldEl) burstRects[idx] = oldEl.getBoundingClientRect();
    });

    renderFileList();

    updatedIndices.forEach(idx => {
        const el = fileListEl.querySelector<HTMLElement>(`[data-index="${idx}"]`);
        if (!el) return;
        const rect = burstRects[idx] || el.getBoundingClientRect();
        burstAndRegrow(el, rect);
    });
    scheduleSave();
}

export function initDropzone(): void {
    dropzone.addEventListener('dragover', e => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', e => {
        if (!dropzone.contains(e.relatedTarget as Node)) {
            dropzone.classList.remove('dragover');
        }
    });
    dropzone.addEventListener('drop', handleDrop);

    // Main content as drop target (when files already exist)
    let mainDragCounter = 0;

    function showMainOverlay(): void {
        const rect = mainContentEl.getBoundingClientRect();
        mainContentDropOverlay.style.top = rect.top + 'px';
        mainContentDropOverlay.style.left = rect.left + 'px';
        mainContentDropOverlay.style.width = rect.width + 'px';
        mainContentDropOverlay.style.height = rect.height + 'px';
        mainContentDropOverlay.classList.add('active');
    }

    function hideMainOverlay(): void {
        mainContentDropOverlay.classList.remove('active');
    }

    mainContentEl.addEventListener('dragenter', e => {
        if (state.dragSrcIndex !== null) return;
        if (!state.items.length) return;
        e.preventDefault();
        mainDragCounter++;
        if (mainDragCounter === 1) showMainOverlay();
    });
    mainContentEl.addEventListener('dragover', e => {
        if (state.dragSrcIndex !== null) return;
        if (!state.items.length) return;
        e.preventDefault();
    });
    mainContentEl.addEventListener('dragleave', () => {
        if (state.dragSrcIndex !== null) return;
        if (!state.items.length) return;
        mainDragCounter--;
        if (mainDragCounter <= 0) {
            mainDragCounter = 0;
            hideMainOverlay();
        }
    });
    mainContentEl.addEventListener('drop', e => {
        mainDragCounter = 0;
        hideMainOverlay();
        if (state.dragSrcIndex !== null) return;
        if (!state.items.length) return;
        handleDrop(e);
    });

    pathCapture.addEventListener('drop', e => {
        const textData = e.dataTransfer!.getData('text') || e.dataTransfer!.getData('text/uri-list') || '';
        if (textData) {
            pathCapture.value = textData;
        }
    });
}