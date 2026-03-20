import { state } from './state';
import { escapeHtml, formatSize, getExtColor } from './helpers';
import { t, getCurrentLang } from './i18n';
import {
    fileListEl, mainActions, mergeOptions, downloadPdfBtn,
    dropzone, fileListWrapper, togglePdfToTextLabel,
    viewListBtn, viewTilesBtn,
} from './dom';
import { scheduleSave } from './projects';

/* ── Custom tooltip for tiles ── */
const TOOLTIP_DELAY = 1000;
const TOOLTIP_PADDING = 6; // px tolerance around name/path area
let tooltipEl: HTMLElement | null = null;
let tooltipTimer: ReturnType<typeof setTimeout> | null = null;
let isDragging = false;

function getOrCreateTooltip(): HTMLElement {
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'tile-tooltip';
        document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
}

function hideTooltip(): void {
    if (tooltipTimer) { clearTimeout(tooltipTimer); tooltipTimer = null; }
    if (tooltipEl) tooltipEl.classList.remove('visible');
}

function setupTileTooltip(tile: HTMLElement, fullPath: string): void {
    const hitZone = tile.querySelector('.tile-text-zone') as HTMLElement;
    if (!hitZone) return;

    hitZone.addEventListener('mouseenter', () => {
        if (isDragging) return;
        tooltipTimer = setTimeout(() => {
            const tip = getOrCreateTooltip();
            tip.textContent = fullPath;
            tip.classList.add('visible');

            const rect = tile.getBoundingClientRect();
            const tipRect = tip.getBoundingClientRect();
            const margin = 6;

            // Horizontal: center on tile, clamp to viewport
            let left = rect.left + rect.width / 2 - tipRect.width / 2;
            left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));

            // Vertical: prefer above tile, flip below if not enough space
            let top = rect.top - tipRect.height - 4;
            if (top < margin) {
                top = rect.bottom + 4;
            }

            tip.style.left = left + 'px';
            tip.style.top = top + 'px';
        }, TOOLTIP_DELAY);
    });

    hitZone.addEventListener('mouseleave', hideTooltip);
}

/* ── View toggle ── */
function updateViewToggleButtons(): void {
    viewListBtn.classList.toggle('active', state.viewMode === 'list');
    viewTilesBtn.classList.toggle('active', state.viewMode === 'tiles');
}

export function initViewToggle(): void {
    updateViewToggleButtons();
    viewListBtn.addEventListener('click', () => {
        if (state.viewMode === 'list') return;
        state.viewMode = 'list';
        localStorage.setItem('fmerge_viewMode', 'list');
        updateViewToggleButtons();
        renderFileList();
    });
    viewTilesBtn.addEventListener('click', () => {
        if (state.viewMode === 'tiles') return;
        state.viewMode = 'tiles';
        localStorage.setItem('fmerge_viewMode', 'tiles');
        updateViewToggleButtons();
        renderFileList();
    });
}

export function renderFileList(): void {
    hideTooltip();
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

    // Toggle class on file list for grid layout
    fileListEl.classList.toggle('file-list--tiles', state.viewMode === 'tiles');

    state.files.forEach((entry, i) => {
        const el = document.createElement('div');
        el.className = state.viewMode === 'tiles' ? 'file-tile' : 'file-item';
        el.draggable = true;
        el.dataset.index = String(i);

        const extRaw = entry.path.split('.').pop()!;
        const ext = extRaw.toUpperCase().slice(0, 4);
        const extColor = getExtColor(extRaw);
        const size = formatSize(entry.size);

        const isPdf = entry.name.toLowerCase().endsWith('.pdf');
        const lineCount = (!isPdf && entry.content) ? entry.content.split('\n').length : 0;
        const linesText = isPdf ? 'PDF' : (lineCount ? lineCount.toLocaleString(getCurrentLang()) + ' ' + t('lines') : '\u2026');

        const orderNum = i + 1;

        if (state.viewMode === 'tiles') {
            el.innerHTML = `
      <span class="tile-order">${orderNum}</span>
      <span class="file-icon" style="background:${extColor}22;color:${extColor};border:1px solid ${extColor}44">${ext}</span>
      <div class="tile-text-zone">
        <div class="tile-name">${escapeHtml(entry.name)}</div>
        <div class="tile-path">${escapeHtml(entry.path)}</div>
      </div>
      <div class="tile-meta"><span>${size}</span><span>${linesText}</span></div>
      <button class="remove-btn tile-remove" title="${escapeHtml(t('remove'))}">\u2715</button>
    `;
            setupTileTooltip(el, entry.path);
        } else {
            el.innerHTML = `
      <span class="item-order">${orderNum}</span>
      <span class="grip">\u2817</span>
      <span class="file-icon" style="background:${extColor}22;color:${extColor};border:1px solid ${extColor}44">${ext}</span>
      <div class="file-info">
        <div class="file-name">${escapeHtml(entry.name)}</div>
        <div class="file-path" title="${escapeHtml(entry.path)}">${escapeHtml(entry.path)}</div>
      </div>
      <span class="file-meta">${size}<br>${linesText}</span>
      <button class="remove-btn" title="${escapeHtml(t('remove'))}">\u2715</button>
    `;
        }

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
            isDragging = true;
            hideTooltip();
        });
        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
            state.dragSrcIndex = null;
            isDragging = false;
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