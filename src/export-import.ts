import { getAllProjects, saveProject, generateId } from './db';
import type { Project } from './db';
import { escapeHtml } from './helpers';
import { t } from './i18n';
import { toast } from './toast';
import { switchToProject, renderProjectList, persistCurrentProject } from './projects';

// ── Crypto helpers (Web Crypto API) ──

const MIN_PASSWORD_LEN = 6;
const MAGIC = new Uint8Array([0x53, 0x44, 0x43, 0x4B]); // "SDCK"
const VERSION = 1;
const SALT_LEN = 16;
const IV_LEN = 12;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password) as BufferSource, 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt as BufferSource, iterations: 600_000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

async function streamTransform(stream: ReadableStream<Uint8Array>, writable: WritableStream, data: Uint8Array): Promise<Uint8Array> {
    const writer = writable.getWriter();
    void writer.write(data as BufferSource);
    void writer.close();
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { result.set(c, offset); offset += c.length; }
    return result;
}

async function compress(data: Uint8Array): Promise<Uint8Array> {
    const cs = new CompressionStream('gzip');
    return streamTransform(cs.readable, cs.writable, data);
}

async function decompress(data: Uint8Array): Promise<Uint8Array> {
    const ds = new DecompressionStream('gzip');
    return streamTransform(ds.readable, ds.writable, data);
}

// Format: MAGIC(4) + VERSION(1) + encrypted(1) + [salt(16) + iv(12) + ciphertext] or [compressed_json]
async function packExport(projects: Project[], password: string): Promise<Uint8Array> {
    const json = JSON.stringify(projects);
    const compressed = await compress(new TextEncoder().encode(json));
    const encrypted = password.length > 0;

    if (!encrypted) {
        // No encryption: MAGIC + VERSION + 0x00 + compressed
        const result = new Uint8Array(MAGIC.length + 1 + 1 + compressed.length);
        result.set(MAGIC, 0);
        result[MAGIC.length] = VERSION;
        result[MAGIC.length + 1] = 0x00;
        result.set(compressed, MAGIC.length + 2);
        return result;
    }

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key = await deriveKey(password, salt);
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, compressed as BufferSource));

    const result = new Uint8Array(MAGIC.length + 1 + 1 + SALT_LEN + IV_LEN + ciphertext.length);
    let offset = 0;
    result.set(MAGIC, offset); offset += MAGIC.length;
    result[offset++] = VERSION;
    result[offset++] = 0x01; // encrypted flag
    result.set(salt, offset); offset += SALT_LEN;
    result.set(iv, offset); offset += IV_LEN;
    result.set(ciphertext, offset);
    return result;
}

interface UnpackResult {
    projects: Project[];
    needsPassword: boolean;
}

async function unpackImport(data: Uint8Array, password?: string): Promise<UnpackResult> {
    // Verify magic
    for (let i = 0; i < MAGIC.length; i++) {
        if (data[i] !== MAGIC[i]) throw new Error('invalid_format');
    }
    const version = data[MAGIC.length];
    if (version !== VERSION) throw new Error('invalid_format');

    const encrypted = data[MAGIC.length + 1] === 0x01;
    const payloadStart = MAGIC.length + 2;

    if (encrypted && !password) {
        return { projects: [], needsPassword: true };
    }

    let compressed: Uint8Array;

    if (encrypted) {
        const salt = data.slice(payloadStart, payloadStart + SALT_LEN);
        const iv = data.slice(payloadStart + SALT_LEN, payloadStart + SALT_LEN + IV_LEN);
        const ciphertext = data.slice(payloadStart + SALT_LEN + IV_LEN);
        try {
            const key = await deriveKey(password!, salt);
            compressed = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext as BufferSource));
        } catch {
            throw new Error('decrypt_failed');
        }
    } else {
        compressed = data.slice(payloadStart);
    }

    let json: string;
    try {
        json = new TextDecoder().decode(await decompress(compressed));
    } catch {
        throw new Error('parse_failed');
    }

    let projects: Project[];
    try {
        projects = JSON.parse(json);
    } catch {
        throw new Error('parse_failed');
    }

    return { projects, needsPassword: false };
}

// ── Export UI ──

export async function showExportDialog(): Promise<void> {
    const projects = await getAllProjects();
    if (projects.length === 0) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const projectCheckboxes = projects.map(p =>
        `<label class="export-project-item">
            <input type="checkbox" value="${escapeHtml(p.id)}" checked>
            <span>${escapeHtml(p.name)}</span>
            <span class="export-project-meta">${p.files.length} files</span>
        </label>`
    ).join('');

    overlay.innerHTML = `
        <div class="modal modal--large">
            <div class="modal-title">${escapeHtml(t('exportTitle'))}</div>
            <div class="modal-body">
                <label class="export-select-all">
                    <input type="checkbox" id="exportSelectAll" checked>
                    <strong>${escapeHtml(t('exportSelectAll'))}</strong>
                </label>
                <div class="export-project-list">${projectCheckboxes}</div>
                <div class="modal-field-group">
                    <label class="modal-label">${escapeHtml(t('exportPassword'))}</label>
                    <input type="password" class="modal-input" id="exportPassword" placeholder="${escapeHtml(t('exportPasswordPlaceholder'))}">
                </div>
            </div>
            <div class="modal-error" style="display:none"></div>
            <div class="modal-buttons">
                <button class="btn btn-secondary modal-cancel">${escapeHtml(t('cancel'))}</button>
                <button class="btn btn-primary modal-confirm">${escapeHtml(t('exportBtn'))}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const selectAllCb = overlay.querySelector<HTMLInputElement>('#exportSelectAll')!;
    const itemCbs = overlay.querySelectorAll<HTMLInputElement>('.export-project-item input[type="checkbox"]');
    const errorEl = overlay.querySelector<HTMLElement>('.modal-error')!;

    selectAllCb.addEventListener('change', () => {
        itemCbs.forEach(cb => cb.checked = selectAllCb.checked);
    });
    itemCbs.forEach(cb => cb.addEventListener('change', () => {
        const allChecked = Array.from(itemCbs).every(c => c.checked);
        const someChecked = Array.from(itemCbs).some(c => c.checked);
        selectAllCb.checked = allChecked;
        selectAllCb.indeterminate = !allChecked && someChecked;
    }));

    function close() {
        overlay.classList.remove('visible');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    }

    overlay.querySelector('.modal-cancel')!.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    overlay.querySelector('.modal-confirm')!.addEventListener('click', async () => {
        const selectedIds = Array.from(itemCbs).filter(cb => cb.checked).map(cb => cb.value);
        if (selectedIds.length === 0) {
            errorEl.textContent = t('exportNoSelection');
            errorEl.style.display = '';
            return;
        }

        const password = (overlay.querySelector<HTMLInputElement>('#exportPassword')!).value;
        if (password.length > 0 && password.length < MIN_PASSWORD_LEN) {
            errorEl.textContent = t('exportPasswordTooShort', { min: MIN_PASSWORD_LEN });
            errorEl.style.display = '';
            return;
        }
        errorEl.style.display = 'none';

        // Persist current project before export to ensure latest data
        await persistCurrentProject();

        const selectedProjects: Project[] = [];
        for (const id of selectedIds) {
            const p = projects.find(proj => proj.id === id);
            if (p) selectedProjects.push(p);
        }

        try {
            const data = await packExport(selectedProjects, password);
            const blob = new Blob([data as BlobPart], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'stitchdeck-export.sdeck';
            a.click();
            URL.revokeObjectURL(url);
            close();
            toast(t('exportSuccess', { count: selectedProjects.length }), 'success');
        } catch (e) {
            errorEl.textContent = String(e);
            errorEl.style.display = '';
        }
    });
}

// ── Import UI ──

export function triggerImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sdeck';
    input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            await processImport(data);
        } catch (e) {
            toast(t('importError', { message: String(e) }), 'error');
        }
    });
    input.click();
}

async function processImport(data: Uint8Array, password?: string): Promise<void> {
    let result: UnpackResult;
    try {
        result = await unpackImport(data, password);
    } catch (e: unknown) {
        const err = e instanceof Error ? e.message : String(e);
        if (err === 'invalid_format') {
            toast(t('importFileInvalid'), 'error');
        } else if (err === 'decrypt_failed') {
            toast(t('importDecryptFailed'), 'error');
        } else if (err === 'parse_failed') {
            toast(t('importParseFailed'), 'error');
        } else {
            toast(t('importError', { message: err }), 'error');
        }
        return;
    }

    if (result.needsPassword) {
        // Show password prompt
        const pw = await showPasswordPrompt();
        if (pw === null) return;
        await processImport(data, pw);
        return;
    }

    const importedProjects = result.projects;
    if (importedProjects.length === 0) return;

    const existingProjects = await getAllProjects();
    const existingNames = new Set(existingProjects.map(p => p.name));

    // Find duplicates
    const duplicates = importedProjects.filter(p => existingNames.has(p.name));
    const nonDuplicates = importedProjects.filter(p => !existingNames.has(p.name));

    // Import non-duplicates directly
    let importedCount = 0;
    const errors: string[] = [];

    for (const p of nonDuplicates) {
        try {
            p.id = generateId();
            await saveProject(p);
            importedCount++;
        } catch (e) {
            errors.push(t('importError', { message: `${p.name}: ${String(e)}` }));
        }
    }

    // Handle duplicates
    if (duplicates.length > 0) {
        const resolution = await showDuplicateDialog(duplicates, existingProjects);
        if (resolution) {
            for (const item of resolution) {
                try {
                    if (item.action === 'skip') continue;
                    if (item.action === 'overwrite') {
                        const existing = existingProjects.find(ep => ep.name === item.project.name);
                        if (existing) {
                            item.project.id = existing.id;
                            await saveProject(item.project);
                            importedCount++;
                        }
                    } else if (item.action === 'rename') {
                        item.project.id = generateId();
                        item.project.name = item.newName || t('importRenamed', { name: item.project.name });
                        await saveProject(item.project);
                        importedCount++;
                    } else if (item.action === 'duplicate') {
                        item.project.id = generateId();
                        await saveProject(item.project);
                        importedCount++;
                    }
                } catch (e) {
                    errors.push(t('importError', { message: `${item.project.name}: ${String(e)}` }));
                }
            }
        }
    }

    // Show errors
    for (const err of errors) {
        toast(err, 'error');
    }

    if (importedCount > 0) {
        toast(t('importSuccess', { count: importedCount }), 'success');
        await renderProjectList();
        // Switch to last imported project
        const allProjects = await getAllProjects();
        if (allProjects.length > 0) {
            const lastImported = allProjects[allProjects.length - 1];
            await switchToProject(lastImported.id);
            await renderProjectList();
        }
    }
}

function showPasswordPrompt(): Promise<string | null> {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-title">${escapeHtml(t('importPasswordRequired'))}</div>
                <div class="modal-body">
                    <div class="modal-field-group">
                        <label class="modal-label">${escapeHtml(t('importPassword'))}</label>
                        <input type="password" class="modal-input" id="importPasswordInput" placeholder="${escapeHtml(t('importPasswordPlaceholder'))}">
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="btn btn-secondary modal-cancel">${escapeHtml(t('cancel'))}</button>
                    <button class="btn btn-primary modal-confirm">${escapeHtml(t('importBtn'))}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));

        const input = overlay.querySelector<HTMLInputElement>('#importPasswordInput')!;
        input.focus();

        function close(value: string | null) {
            overlay.classList.remove('visible');
            overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
            resolve(value);
        }

        overlay.querySelector('.modal-confirm')!.addEventListener('click', () => {
            close(input.value);
        });
        overlay.querySelector('.modal-cancel')!.addEventListener('click', () => close(null));
        overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') close(input.value);
            if (e.key === 'Escape') close(null);
        });
        overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(null); });
    });
}

interface DuplicateResolution {
    project: Project;
    action: 'overwrite' | 'rename' | 'duplicate' | 'skip';
    newName?: string;
}

function showDuplicateDialog(duplicates: Project[], _existing: Project[]): Promise<DuplicateResolution[] | null> {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const rows = duplicates.map((p, i) =>
            `<div class="duplicate-row" data-index="${i}">
                <div class="duplicate-row-top">
                    <span class="duplicate-name">${escapeHtml(p.name)}</span>
                    <select class="duplicate-action" data-index="${i}">
                        <option value="rename" selected>${escapeHtml(t('importRename'))}</option>
                        <option value="overwrite">${escapeHtml(t('importOverwrite'))}</option>
                        <option value="duplicate">${escapeHtml(t('importDuplicate'))}</option>
                        <option value="skip">${escapeHtml(t('importSkip'))}</option>
                    </select>
                </div>
                <div class="duplicate-rename-input">
                    <input type="text" class="modal-input duplicate-new-name" data-index="${i}" value="${escapeHtml(t('importRenamed', { name: p.name }))}">
                </div>
            </div>`
        ).join('');

        overlay.innerHTML = `
            <div class="modal modal--large">
                <div class="modal-title">${escapeHtml(t('importDuplicateTitle'))}</div>
                <div class="modal-body">
                    <p class="modal-intro">${escapeHtml(t('importDuplicateIntro'))}</p>
                    <div class="duplicate-list">${rows}</div>
                </div>
                <div class="modal-buttons">
                    <button class="btn btn-secondary modal-cancel">${escapeHtml(t('cancel'))}</button>
                    <button class="btn btn-primary modal-confirm">${escapeHtml(t('importBtn'))}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));

        // Toggle rename input visibility based on select value
        const selects = overlay.querySelectorAll<HTMLSelectElement>('.duplicate-action');
        selects.forEach(sel => {
            sel.addEventListener('change', () => {
                const row = sel.closest('.duplicate-row')!;
                const renameInput = row.querySelector<HTMLElement>('.duplicate-rename-input')!;
                renameInput.style.display = sel.value === 'rename' ? '' : 'none';
            });
        });

        function close(value: DuplicateResolution[] | null) {
            overlay.classList.remove('visible');
            overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
            resolve(value);
        }

        overlay.querySelector('.modal-confirm')!.addEventListener('click', () => {
            const result: DuplicateResolution[] = [];
            selects.forEach(sel => {
                const idx = parseInt(sel.dataset.index!, 10);
                const row = sel.closest('.duplicate-row')!;
                const nameInput = row.querySelector<HTMLInputElement>('.duplicate-new-name')!;
                result.push({
                    project: duplicates[idx],
                    action: sel.value as DuplicateResolution['action'],
                    newName: sel.value === 'rename' ? (nameInput.value.trim() || duplicates[idx].name) : undefined,
                });
            });
            close(result);
        });
        overlay.querySelector('.modal-cancel')!.addEventListener('click', () => close(null));
        overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
        overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(null); });
    });
}