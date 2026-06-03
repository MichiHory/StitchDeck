import { state } from './state';
import { escapeHtml, formatSize, getExtColor } from './helpers';
import { t, getCurrentLang } from './i18n';
import {
    fileListEl, mainActions, mergeOptions, downloadPdfBtn,
    dropzone, fileListWrapper, togglePdfToTextLabel,
    viewListBtn, viewTilesBtn, viewTreeBtn, addCustomTextBtn,
} from './dom';
import { scheduleSave } from './projects';
import { showModal } from './modal';
import { toast } from './toast';
import type { ListItem } from './inheritance';
import { generateId } from './db';

/* ── Custom tooltip for tiles ── */
const TOOLTIP_DELAY = 1000;
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

/* ── Origin + eye helpers ── */
const EYE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function originClass(item: ListItem): string {
    if (item.hidden && item.origin === 'inherited') return ' entry-inherited entry-hidden';
    if (item.hidden && item.origin === 'override') return ' entry-override entry-hidden';
    if (item.hidden) return ' entry-hidden';
    if (item.origin === 'inherited') return ' entry-inherited';
    if (item.origin === 'override') return ' entry-override';
    return '';
}

function originBadgeHtml(item: ListItem): string {
    if (item.origin === 'inherited') {
        return `<span class="entry-badge entry-badge--main" title="${escapeHtml(t('badgeMainTitle', { name: state.parentProject?.name || '' }))}">${escapeHtml(t('badgeMain'))}</span>`;
    }
    if (item.origin === 'override') {
        return `<span class="entry-badge entry-badge--override" title="${escapeHtml(t('badgeOverrideTitle'))}">${escapeHtml(t('badgeOverride'))}</span>`;
    }
    return '';
}

function eyeBtnHtml(item: ListItem): string {
    const title = item.hidden ? t('showEntry') : t('hideEntry');
    return `<button class="eye-btn${item.hidden ? ' eye-btn--off' : ''}" title="${escapeHtml(title)}">${item.hidden ? EYE_OFF_SVG : EYE_SVG}</button>`;
}

function setupRowActions(el: HTMLElement, item: ListItem, index: number): void {
    el.querySelector('.eye-btn')!.addEventListener('click', (e) => {
        e.stopPropagation();
        item.hidden = !item.hidden;
        renderFileList();
        scheduleSave();
    });
    const removeBtn = el.querySelector('.remove-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (item.origin === 'override') {
                const mainEntry = state.parentProject?.files.find(f => f.id === item.inheritedId);
                if (mainEntry) {
                    state.items[index] = { entry: mainEntry, origin: 'inherited', inheritedId: item.inheritedId, hidden: item.hidden };
                    toast(t('overrideRemoved'), 'success');
                } else {
                    state.items.splice(index, 1);
                }
            } else {
                state.items.splice(index, 1);
            }
            renderFileList();
            scheduleSave();
        });
    }
}

/* ── View toggle ── */
function updateViewToggleButtons(): void {
    viewListBtn.classList.toggle('active', state.viewMode === 'list');
    viewTilesBtn.classList.toggle('active', state.viewMode === 'tiles');
    viewTreeBtn.classList.toggle('active', state.viewMode === 'tree');
}

function switchViewMode(mode: import('./state').ViewMode): void {
    if (state.viewMode === mode) return;
    state.viewMode = mode;
    localStorage.setItem('stitchdeck_viewMode', mode);
    updateViewToggleButtons();
    renderFileList();
}

export function initViewToggle(): void {
    updateViewToggleButtons();
    viewListBtn.addEventListener('click', () => switchViewMode('list'));
    viewTilesBtn.addEventListener('click', () => switchViewMode('tiles'));
    viewTreeBtn.addEventListener('click', () => switchViewMode('tree'));
    addCustomTextBtn.addEventListener('click', () => showCustomTextModal());
}

async function showCustomTextModal(listItem?: ListItem): Promise<void> {
    const isEdit = !!listItem;
    const currentIndex = isEdit ? state.items.indexOf(listItem!) : -1;
    const maxPos = isEdit ? state.items.length : state.items.length + 1;
    const defaultPos = isEdit ? currentIndex + 1 : 1;

    const result = await showModal({
        title: isEdit ? t('editCustomText') : t('customText'),
        modalClass: 'modal--large',
        body: `
            <div class="modal-form-row-inline">
                <div class="modal-form-group" style="flex:1">
                    <label>${escapeHtml(t('customTextTitle'))}</label>
                    <input class="modal-input" type="text" data-role="ct-title" value="${escapeHtml(listItem?.entry.customTitle || '')}" placeholder="${escapeHtml(t('customTextTitle'))}">
                </div>
                <div class="modal-form-group" style="width:80px;flex-shrink:0">
                    <label>${escapeHtml(t('customTextPosition'))}</label>
                    <input class="modal-input" type="number" data-role="ct-position" value="${defaultPos}" min="1" max="${maxPos}">
                </div>
            </div>
            <div class="modal-form-group">
                <label>${escapeHtml(t('customTextContent'))}</label>
                <textarea class="modal-input modal-textarea" data-role="ct-content" rows="10" placeholder="${escapeHtml(t('customTextContent'))}">${escapeHtml(listItem?.entry.content || '')}</textarea>
            </div>
            <label class="toggle-option modal-toggle-option">
                <span class="toggle-switch">
                    <input type="checkbox" data-role="ct-include-title" ${listItem?.entry.includeTitle !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </span>
                <span>${escapeHtml(t('customTextIncludeTitle'))}</span>
            </label>
        `,
        confirmText: isEdit ? t('save') : t('create'),
        confirmClass: 'btn-primary',
        validate: (overlay) => {
            const title = (overlay.querySelector('[data-role="ct-title"]') as HTMLInputElement).value.trim();
            if (!title) return t('customTextTitleRequired');
            return null;
        },
        resolveData: (overlay) => {
            const title = (overlay.querySelector('[data-role="ct-title"]') as HTMLInputElement).value.trim();
            const content = (overlay.querySelector('[data-role="ct-content"]') as HTMLTextAreaElement).value;
            const includeTitle = (overlay.querySelector('[data-role="ct-include-title"]') as HTMLInputElement).checked;
            let position = parseInt((overlay.querySelector('[data-role="ct-position"]') as HTMLInputElement).value, 10);
            if (isNaN(position) || position < 1) position = 1;
            if (position > maxPos) position = maxPos;
            return { title, content, includeTitle, position };
        }
    }) as { title: string; content: string; includeTitle: boolean; position: number } | null;

    if (!result) return;

    if (isEdit && listItem) {
        const currentIdx = state.items.indexOf(listItem);
        if (listItem.origin === 'inherited') {
            // Copy-on-write: editing an inherited custom text creates an override
            const entry: import('./db').FileEntry = {
                id: generateId(),
                name: result.title,
                path: '',
                content: result.content,
                size: new Blob([result.content]).size,
                isCustomText: true,
                customTitle: result.title,
                includeTitle: result.includeTitle,
            };
            state.items[currentIdx] = { entry, origin: 'override', inheritedId: listItem.inheritedId, hidden: listItem.hidden };
        } else {
            const entry = listItem.entry;
            entry.customTitle = result.title;
            entry.name = result.title;
            entry.content = result.content;
            entry.size = new Blob([result.content]).size;
            entry.includeTitle = result.includeTitle;
        }
        const targetIndex = result.position - 1;
        if (currentIdx !== targetIndex) {
            const moved = state.items.splice(currentIdx, 1)[0];
            state.items.splice(targetIndex, 0, moved);
        }
        toast(t('customTextUpdated'), 'success');
    } else {
        const entry: import('./db').FileEntry = {
            id: generateId(),
            name: result.title,
            path: '',
            content: result.content,
            size: new Blob([result.content]).size,
            isCustomText: true,
            customTitle: result.title,
            includeTitle: result.includeTitle,
        };
        state.items.splice(result.position - 1, 0, { entry, origin: 'own', hidden: false });
        toast(t('customTextCreated'), 'success');
    }
    renderFileList();
    scheduleSave();
}

/* ── Tree view helpers ── */
interface TreeNode {
    name: string;
    children: Map<string, TreeNode>;
    files: { item: ListItem; index: number }[];
}

function buildTree(items: ListItem[]): TreeNode {
    const root: TreeNode = { name: '', children: new Map(), files: [] };
    items.forEach((item, index) => {
        const entry = item.entry;
        if (entry.isCustomText) {
            root.files.push({ item, index });
            return;
        }
        const pathParts = entry.path.split('/').filter(Boolean);
        const fileName = pathParts.pop()!;
        void fileName;
        let node = root;
        for (const part of pathParts) {
            if (!node.children.has(part)) {
                node.children.set(part, { name: part, children: new Map(), files: [] });
            }
            node = node.children.get(part)!;
        }
        node.files.push({ item, index });
    });
    return root;
}

// Persistent collapsed state for tree directories (survives re-renders within session)
const collapsedDirs = new Set<string>();

function setupOrderInput(orderEl: HTMLElement, fileIndex: number): void {
    orderEl.classList.add('tree-file-order--clickable');
    orderEl.title = t('changeOrder');
    orderEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentOrder = fileIndex + 1;
        const maxOrder = state.items.length;
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'tree-order-input';
        input.min = '1';
        input.max = String(maxOrder);
        input.value = String(currentOrder);
        input.style.width = `${Math.max(2, String(maxOrder).length) + 1}ch`;

        orderEl.replaceWith(input);
        input.focus();
        input.select();

        const commit = () => {
            let newPos = parseInt(input.value, 10);
            if (isNaN(newPos) || newPos < 1) newPos = 1;
            if (newPos > maxOrder) newPos = maxOrder;
            const newIndex = newPos - 1;
            if (newIndex !== fileIndex) {
                const moved = state.items.splice(fileIndex, 1)[0];
                state.items.splice(newIndex, 0, moved);
                scheduleSave();
            }
            renderFileList();
        };

        let committed = false;
        input.addEventListener('blur', () => {
            if (!committed) { committed = true; commit(); }
        });
        input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') {
                ke.preventDefault();
                if (!committed) { committed = true; commit(); }
            } else if (ke.key === 'Escape') {
                ke.preventDefault();
                committed = true;
                renderFileList();
            }
        });
    });
}

function renderTreeNode(node: TreeNode, container: HTMLElement, depth: number, pathPrefix: string): void {
    // Sort: directories first (alphabetically), then files by their original order
    const sortedDirs = [...node.children.entries()].sort((a, b) =>
        a[0].localeCompare(b[0], getCurrentLang())
    );
    const sortedFiles = [...node.files].sort((a, b) => a.index - b.index);

    for (const [dirName, childNode] of sortedDirs) {
        const dirPath = pathPrefix ? `${pathPrefix}/${dirName}` : dirName;
        const isCollapsed = collapsedDirs.has(dirPath);
        const dirEl = document.createElement('div');
        dirEl.className = 'tree-dir';

        const headerEl = document.createElement('div');
        headerEl.className = 'tree-dir-header';
        headerEl.style.paddingLeft = `${depth * 20 + 8}px`;
        headerEl.innerHTML = `
            <span class="tree-dir-arrow${isCollapsed ? '' : ' open'}">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
            <span class="tree-dir-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </span>
            <span class="tree-dir-name">${escapeHtml(dirName)}</span>
        `;
        headerEl.addEventListener('click', () => {
            if (collapsedDirs.has(dirPath)) {
                collapsedDirs.delete(dirPath);
            } else {
                collapsedDirs.add(dirPath);
            }
            renderFileList();
        });
        dirEl.appendChild(headerEl);

        if (!isCollapsed) {
            const childContainer = document.createElement('div');
            childContainer.className = 'tree-dir-children';
            renderTreeNode(childNode, childContainer, depth + 1, dirPath);
            dirEl.appendChild(childContainer);
        }

        container.appendChild(dirEl);
    }

    for (const { item, index } of sortedFiles) {
        const entry = item.entry;
        const isCustom = !!entry.isCustomText;
        const el = document.createElement('div');
        el.className = 'tree-file' + originClass(item);
        if (isCustom) el.classList.add('custom-text-entry');
        el.style.paddingLeft = `${depth * 20 + 8}px`;
        el.draggable = true;
        el.dataset.index = String(index);

        const orderNum = index + 1;
        const size = formatSize(entry.size);
        const removeHtml = item.origin === 'inherited' ? '' :
            `<button class="remove-btn tree-remove" title="${escapeHtml(item.origin === 'override' ? t('restoreFromMain') : t('remove'))}">✕</button>`;

        if (isCustom) {
            const lineCount = entry.content ? entry.content.split('\n').length : 0;
            const linesText = lineCount ? lineCount.toLocaleString(getCurrentLang()) + ' ' + t('lines') : '…';
            el.innerHTML = `
                <span class="tree-file-order">${orderNum}</span>
                <span class="file-icon custom-text-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </span>
                <span class="tree-file-name">${escapeHtml(entry.customTitle || entry.name)}</span>
                ${originBadgeHtml(item)}
                <span class="tree-file-meta">${size} · ${linesText}</span>
                ${eyeBtnHtml(item)}
                ${removeHtml}
            `;
            const iconEl = el.querySelector('.custom-text-icon') as HTMLElement;
            if (iconEl) {
                iconEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showCustomTextModal(item);
                });
            }
            el.addEventListener('dblclick', (e) => {
                if ((e.target as HTMLElement).closest('.remove-btn, .eye-btn')) return;
                showCustomTextModal(item);
            });
        } else {
            const extRaw = entry.path.split('.').pop()!;
            const ext = extRaw.toUpperCase().slice(0, 4);
            const extColor = getExtColor(extRaw);
            const isPdf = entry.name.toLowerCase().endsWith('.pdf');
            const lineCount = (!isPdf && entry.content) ? entry.content.split('\n').length : 0;
            const linesText = isPdf ? 'PDF' : (lineCount ? lineCount.toLocaleString(getCurrentLang()) + ' ' + t('lines') : '…');

            el.innerHTML = `
                <span class="tree-file-order">${orderNum}</span>
                <span class="file-icon" style="background:${extColor}22;color:${extColor};border:1px solid ${extColor}44">${ext}</span>
                <span class="tree-file-name">${escapeHtml(entry.name)}</span>
                ${originBadgeHtml(item)}
                <span class="tree-file-meta">${size} · ${linesText}</span>
                ${eyeBtnHtml(item)}
                ${removeHtml}
            `;
        }

        // Setup clickable order input
        const orderEl = el.querySelector('.tree-file-order') as HTMLElement;
        if (orderEl) setupOrderInput(orderEl, index);

        setupRowActions(el, item, index);

        // Reorder drag
        el.addEventListener('dragstart', e => {
            state.dragSrcIndex = index;
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
                if (state.dragSrcIndex !== index) {
                    el.classList.add('drag-over-item');
                }
            }
        });
        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over-item');
        });
        el.addEventListener('drop', e => {
            el.classList.remove('drag-over-item');
            if (state.dragSrcIndex !== null && state.dragSrcIndex !== index) {
                e.preventDefault();
                e.stopPropagation();
                const moved = state.items.splice(state.dragSrcIndex, 1)[0];
                state.items.splice(index, 0, moved);
                renderFileList();
                scheduleSave();
            }
        });

        container.appendChild(el);
    }
}

export function renderFileList(): void {
    hideTooltip();
    fileListEl.innerHTML = '';
    mainActions.style.display = state.items.length ? 'flex' : 'none';
    mergeOptions.style.display = state.items.length ? 'flex' : 'none';
    const hasPdf = state.items.some(i => !i.hidden && i.entry.name.toLowerCase().endsWith('.pdf'));
    downloadPdfBtn.style.display = hasPdf ? '' : 'none';
    togglePdfToTextLabel.style.display = hasPdf ? '' : 'none';

    fileListWrapper.style.display = '';
    dropzone.classList.toggle('hidden', state.items.length > 0);
    ++state.renderGeneration;

    // Toggle class on file list for grid layout
    fileListEl.classList.toggle('file-list--tiles', state.viewMode === 'tiles');
    fileListEl.classList.toggle('file-list--tree', state.viewMode === 'tree');

    // Tree view rendering
    if (state.viewMode === 'tree') {
        const tree = buildTree(state.items);
        renderTreeNode(tree, fileListEl, 0, '');
        return;
    }

    state.items.forEach((item, i) => {
        const entry = item.entry;
        const isCustom = !!entry.isCustomText;
        const el = document.createElement('div');
        el.className = (state.viewMode === 'tiles' ? 'file-tile' : 'file-item') + originClass(item);
        if (isCustom) el.classList.add('custom-text-entry');
        el.draggable = true;
        el.dataset.index = String(i);

        const orderNum = i + 1;
        const removeHtml = item.origin === 'inherited' ? '' :
            `<button class="remove-btn${state.viewMode === 'tiles' ? ' tile-remove' : ''}" title="${escapeHtml(item.origin === 'override' ? t('restoreFromMain') : t('remove'))}">✕</button>`;

        if (isCustom) {
            const contentPreview = (entry.content || '').split('\n')[0].slice(0, 80) || '';
            const size = formatSize(entry.size);
            const lineCount = entry.content ? entry.content.split('\n').length : 0;
            const linesText = lineCount ? lineCount.toLocaleString(getCurrentLang()) + ' ' + t('lines') : '…';

            if (state.viewMode === 'tiles') {
                el.innerHTML = `
      <span class="tile-order">${orderNum}</span>
      <span class="file-icon custom-text-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      </span>
      <div class="tile-text-zone">
        <div class="tile-name-row"><div class="tile-name">${escapeHtml(entry.customTitle || entry.name)}</div>${originBadgeHtml(item)}</div>
        <div class="tile-path custom-text-preview">${escapeHtml(contentPreview)}</div>
      </div>
      <div class="tile-meta"><span>${size}</span><span>${linesText}</span></div>
      ${eyeBtnHtml(item)}
      ${removeHtml}
    `;
            } else {
                el.innerHTML = `
      <span class="item-order">${orderNum}</span>
      <span class="grip">⠗</span>
      <span class="file-icon custom-text-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      </span>
      <div class="file-info">
        <div class="file-name-row"><div class="file-name">${escapeHtml(entry.customTitle || entry.name)}</div>${originBadgeHtml(item)}</div>
        <div class="file-path custom-text-preview">${escapeHtml(contentPreview)}</div>
      </div>
      <span class="file-meta">${size}<br>${linesText}</span>
      ${eyeBtnHtml(item)}
      ${removeHtml}
    `;
            }

            // Edit on icon click or double-click
            const iconEl = el.querySelector('.custom-text-icon') as HTMLElement;
            if (iconEl) {
                iconEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showCustomTextModal(item);
                });
            }
            el.addEventListener('dblclick', (e) => {
                // Fix 6: guard both remove-btn and eye-btn
                if ((e.target as HTMLElement).closest('.remove-btn, .eye-btn')) return;
                showCustomTextModal(item);
            });
        } else {
            const extRaw = entry.path.split('.').pop()!;
            const ext = extRaw.toUpperCase().slice(0, 4);
            const extColor = getExtColor(extRaw);
            const size = formatSize(entry.size);

            const isPdf = entry.name.toLowerCase().endsWith('.pdf');
            const lineCount = (!isPdf && entry.content) ? entry.content.split('\n').length : 0;
            const linesText = isPdf ? 'PDF' : (lineCount ? lineCount.toLocaleString(getCurrentLang()) + ' ' + t('lines') : '…');

            if (state.viewMode === 'tiles') {
                el.innerHTML = `
      <span class="tile-order">${orderNum}</span>
      <span class="file-icon" style="background:${extColor}22;color:${extColor};border:1px solid ${extColor}44">${ext}</span>
      <div class="tile-text-zone">
        <div class="tile-name-row"><div class="tile-name">${escapeHtml(entry.name)}</div>${originBadgeHtml(item)}</div>
        <div class="tile-path">${escapeHtml(entry.path)}</div>
      </div>
      <div class="tile-meta"><span>${size}</span><span>${linesText}</span></div>
      ${eyeBtnHtml(item)}
      ${removeHtml}
    `;
                setupTileTooltip(el, entry.path);
            } else {
                el.innerHTML = `
      <span class="item-order">${orderNum}</span>
      <span class="grip">⠗</span>
      <span class="file-icon" style="background:${extColor}22;color:${extColor};border:1px solid ${extColor}44">${ext}</span>
      <div class="file-info">
        <div class="file-name-row"><div class="file-name">${escapeHtml(entry.name)}</div>${originBadgeHtml(item)}</div>
        <div class="file-path" title="${escapeHtml(entry.path)}">${escapeHtml(entry.path)}</div>
      </div>
      <span class="file-meta">${size}<br>${linesText}</span>
      ${eyeBtnHtml(item)}
      ${removeHtml}
    `;
            }
        }

        setupRowActions(el, item, i);

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
                const moved = state.items.splice(state.dragSrcIndex, 1)[0];
                state.items.splice(i, 0, moved);
                renderFileList();
                scheduleSave();
            }
        });

        fileListEl.appendChild(el);
    });
}