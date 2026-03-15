import { state } from './state';
import { escapeHtml, formatSize, getExtColor } from './helpers';
import { t, getCurrentLang } from './i18n';
import {
    fileListEl, mainActions, mergeOptions, downloadPdfBtn,
    dropzone, fileListWrapper, togglePdfToTextLabel,
} from './dom';
import { scheduleSave } from './projects';

export function renderFileList(): void {
    fileListEl.innerHTML = '';
    mainActions.style.display = state.files.length ? 'flex' : 'none';
    mergeOptions.style.display = state.files.length ? 'flex' : 'none';
    const hasPdf = state.files.some(f => f.name.toLowerCase().endsWith('.pdf'));
    downloadPdfBtn.style.display = hasPdf ? '' : 'none';
    togglePdfToTextLabel.style.display = hasPdf ? '' : 'none';

    if (state.files.length) {
        dropzone.classList.add('hidden');
        fileListWrapper.style.display = '';
    } else {
        dropzone.classList.remove('hidden');
        fileListWrapper.style.display = 'none';
    }
    ++state.renderGeneration;

    state.files.forEach((entry, i) => {
        const el = document.createElement('div');
        el.className = 'file-item';
        el.draggable = true;
        el.dataset.index = String(i);

        const extRaw = entry.path.split('.').pop()!;
        const ext = extRaw.toUpperCase().slice(0, 4);
        const extColor = getExtColor(extRaw);
        const size = formatSize(entry.size);

        const isPdf = entry.name.toLowerCase().endsWith('.pdf');
        const lineCount = (!isPdf && entry.content) ? entry.content.split('\n').length : 0;
        const linesText = isPdf ? 'PDF' : (lineCount ? lineCount.toLocaleString(getCurrentLang()) + ' ' + t('lines') : '\u2026');

        el.innerHTML = `
      <span class="grip">\u2817</span>
      <span class="file-icon" style="background:${extColor}22;color:${extColor};border:1px solid ${extColor}44">${ext}</span>
      <div class="file-info">
        <div class="file-name">${escapeHtml(entry.name)}</div>
        <div class="file-path" title="${escapeHtml(entry.path)}">${escapeHtml(entry.path)}</div>
      </div>
      <span class="file-meta">${size}<br>${linesText}</span>
      <button class="remove-btn" title="${escapeHtml(t('remove'))}">\u2715</button>
    `;

        el.querySelector('.remove-btn')!.addEventListener('click', () => {
            state.files.splice(i, 1);
            renderFileList();
            scheduleSave();
        });

        // Reorder drag
        el.addEventListener('dragstart', e => {
            state.dragSrcIndex = i;
            el.classList.add('dragging');
            e.dataTransfer!.effectAllowed = 'move';
        });
        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
            state.dragSrcIndex = null;
            document.querySelectorAll('.drag-over-item').forEach(x => x.classList.remove('drag-over-item'));
        });
        el.addEventListener('dragover', e => {
            if (state.dragSrcIndex !== null) {
                e.preventDefault();
                if (state.dragSrcIndex !== i) {
                    el.classList.add('drag-over-item');
                }
            }
        });
        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over-item');
        });
        el.addEventListener('drop', e => {
            el.classList.remove('drag-over-item');
            if (state.dragSrcIndex !== null && state.dragSrcIndex !== i) {
                e.preventDefault();
                e.stopPropagation();
                const moved = state.files.splice(state.dragSrcIndex, 1)[0];
                state.files.splice(i, 0, moved);
                renderFileList();
                scheduleSave();
            }
        });

        fileListEl.appendChild(el);
    });
}