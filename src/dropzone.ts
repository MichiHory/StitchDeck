import { state } from './state';
import type { FileEntry } from './db';
import { cleanPath, readFile } from './helpers';
import { t } from './i18n';
import { toast } from './toast';
import { renderFileList } from './file-list';
import { scheduleSave } from './projects';
import { burstAndRegrow } from './animations';
import { readFileAsArrayBuffer, arrayBufferToBase64 } from './pdf';
import {
    dropzone, fileListEl, fileListWrapper,
    mainContentEl, mainContentDropOverlay, pathCapture,
} from './dom';

function handleDrop(e: DragEvent): void {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    fileListWrapper.classList.remove('drag-active');

    const dt = e.dataTransfer!;
    const droppedFiles = dt.files;
    if (!droppedFiles.length) return;

    const textData = dt.getData('text') || dt.getData('text/uri-list') || '';
    const pathLines = textData.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const textareaLines = pathCapture.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    pathCapture.value = '';

    const capturedPaths = pathLines.length >= droppedFiles.length ? pathLines : textareaLines;

    handleFilesWithPaths(droppedFiles, capturedPaths);
}

async function handleFilesWithPaths(fileList: FileList, capturedPaths: string[]): Promise<void> {
    const updatedIndices: number[] = [];
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

        const isPdf = f.name.toLowerCase().endsWith('.pdf');
        let content: string | null = null;
        let pdfData: string | undefined;
        if (isPdf) {
            const arrayBuf = await readFileAsArrayBuffer(f);
            pdfData = arrayBufferToBase64(arrayBuf);
        } else {
            content = await readFile(f);
        }
        const existingIndex = state.files.findIndex(entry => entry.path === path);
        const fileEntry: FileEntry = { name: f.name, path, content, size: f.size };
        if (pdfData) fileEntry.pdfData = pdfData;
        if (existingIndex !== -1) {
            state.files[existingIndex] = fileEntry;
            updatedIndices.push(existingIndex);
            toast(t('updated', { name: f.name }), 'success');
        } else {
            state.files.push(fileEntry);
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
        if (!state.files.length) return;
        e.preventDefault();
        mainDragCounter++;
        if (mainDragCounter === 1) showMainOverlay();
    });
    mainContentEl.addEventListener('dragover', e => {
        if (state.dragSrcIndex !== null) return;
        if (!state.files.length) return;
        e.preventDefault();
    });
    mainContentEl.addEventListener('dragleave', () => {
        if (state.dragSrcIndex !== null) return;
        if (!state.files.length) return;
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
        if (!state.files.length) return;
        handleDrop(e);
    });

    pathCapture.addEventListener('drop', e => {
        const textData = e.dataTransfer!.getData('text') || e.dataTransfer!.getData('text/uri-list') || '';
        if (textData) {
            pathCapture.value = textData;
        }
    });
}