import { state } from './state';
import type { FileEntry, GitHubConfig } from './db';
import { getProject, saveProject } from './db';
import { t } from './i18n';
import { toast } from './toast';
import { showModal } from './modal';
import { escapeHtml, getExtColor } from './helpers';
import { renderFileList } from './file-list';
import { scheduleSave, renderProjectList, updateGitHubStatus } from './projects';

/* ── GitHub API helpers ── */

interface GitHubTreeItem {
    path: string;
    mode: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
    url: string;
}

interface GitHubBranch {
    name: string;
    commit: { sha: string };
}

function apiHeaders(token?: string): HeadersInit {
    const h: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) h['Authorization'] = `token ${token}`;
    return h;
}

async function apiFetch(url: string, token?: string): Promise<Response> {
    const res = await fetch(url, { headers: apiHeaders(token) });
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new Error(t('ghErrorAuth'));
        if (res.status === 404) throw new Error(t('ghErrorNotFound'));
        throw new Error(`GitHub API: ${res.status} ${res.statusText}`);
    }
    return res;
}

/* ── .gitignore pattern matching ── */

function parseGitignore(content: string): string[] {
    return content.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
}

function patternToRegex(pattern: string): RegExp {
    const negated = pattern.startsWith('!');
    if (negated) pattern = pattern.slice(1);

    let anchored = false;
    if (pattern.startsWith('/')) {
        anchored = true;
        pattern = pattern.slice(1);
    }

    const isDir = pattern.endsWith('/');
    if (isDir) pattern = pattern.slice(0, -1);

    // Escape regex special chars except * and ?
    let regex = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // Handle **/ (match any directory depth)
    regex = regex.replace(/\*\*\//g, '(?:.+/)?');
    // Handle /** (match everything inside)
    regex = regex.replace(/\/\*\*/g, '(?:/.*)?');
    // Handle ** in the middle
    regex = regex.replace(/\*\*/g, '.*');
    // Handle single *
    regex = regex.replace(/(?<!\.\*)\*/g, '[^/]*');
    // Handle ?
    regex = regex.replace(/\?/g, '[^/]');

    if (anchored) {
        regex = '^' + regex;
    } else {
        regex = '(?:^|/)' + regex;
    }

    if (isDir) {
        regex += '(?:/|$)';
    } else {
        regex += '(?:/|$)';
    }

    return new RegExp(regex);
}

function isIgnored(filePath: string, patterns: string[], customExcludes: string[]): boolean {
    let ignored = false;

    for (const pattern of patterns) {
        const negated = pattern.startsWith('!');
        const p = negated ? pattern.slice(1) : pattern;
        try {
            const re = patternToRegex(p);
            if (re.test(filePath)) {
                ignored = !negated;
            }
        } catch { /* skip invalid patterns */ }
    }

    if (!ignored) {
        for (const exclude of customExcludes) {
            if (!exclude) continue;
            const normalized = exclude.replace(/^\/+|\/+$/g, '');
            if (filePath === normalized || filePath.startsWith(normalized + '/')) {
                return true;
            }
        }
    }

    return ignored;
}

/* ── Fetch repo data ── */

export async function fetchBranches(owner: string, repo: string, token?: string): Promise<string[]> {
    const res = await apiFetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, token);
    const branches: GitHubBranch[] = await res.json();
    return branches.map(b => b.name);
}

async function fetchFullTree(owner: string, repo: string, branch: string, token?: string): Promise<GitHubTreeItem[]> {
    const res = await apiFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        token
    );
    const data = await res.json();
    if (data.truncated) {
        toast(t('ghTreeTruncated'));
    }
    return data.tree as GitHubTreeItem[];
}

async function fetchTree(owner: string, repo: string, branch: string, token?: string): Promise<GitHubTreeItem[]> {
    const tree = await fetchFullTree(owner, repo, branch, token);
    return tree.filter(item => item.type === 'blob');
}

export interface TreeEntry {
    path: string;
    type: 'blob' | 'tree';
}

export async function fetchTreeEntries(owner: string, repo: string, branch: string, token?: string): Promise<TreeEntry[]> {
    const tree = await fetchFullTree(owner, repo, branch, token);
    return tree.map(item => ({ path: item.path, type: item.type }));
}

async function fetchFileContent(owner: string, repo: string, path: string, branch: string, token?: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
    const res = await fetch(url, token ? { headers: { 'Authorization': `token ${token}` } } : undefined);
    if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
    return res.text();
}

async function fetchGitignorePatterns(owner: string, repo: string, branch: string, tree: GitHubTreeItem[], token?: string): Promise<string[]> {
    const gitignoreFiles = tree.filter(item => item.path.endsWith('.gitignore'));
    const allPatterns: string[] = [];

    for (const gi of gitignoreFiles) {
        try {
            const content = await fetchFileContent(owner, repo, gi.path, branch, token);
            const dir = gi.path === '.gitignore' ? '' : gi.path.replace(/\.gitignore$/, '');
            const patterns = parseGitignore(content);
            for (const p of patterns) {
                allPatterns.push(dir ? dir + p : p);
            }
        } catch { /* skip unreadable gitignore */ }
    }

    return allPatterns;
}

/* ── Binary detection ── */

const BINARY_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'avif', 'svg',
    'woff', 'woff2', 'ttf', 'otf', 'eot',
    'zip', 'gz', 'tar', 'bz2', 'xz', '7z', 'rar',
    'exe', 'dll', 'so', 'dylib', 'bin',
    'mp3', 'mp4', 'wav', 'ogg', 'webm', 'avi', 'mov',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'pyc', 'class', 'o', 'obj',
    'sqlite', 'db',
    'lock',
]);

function isBinaryFile(path: string): boolean {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    return BINARY_EXTENSIONS.has(ext);
}

/* ── Main sync function ── */

export async function syncFromGitHub(config: GitHubConfig, progressCallback?: (msg: string) => void): Promise<FileEntry[]> {
    const { owner, repo, branch, token, customExcludes } = config;

    progressCallback?.(t('ghFetchingTree'));
    const tree = await fetchTree(owner, repo, branch, token);

    progressCallback?.(t('ghParsingGitignore'));
    const gitignorePatterns = await fetchGitignorePatterns(owner, repo, branch, tree, token);

    // Filter files: respect .gitignore + custom excludes, skip binary
    const filesToFetch = tree.filter(item => {
        if (isBinaryFile(item.path)) return false;
        if (isIgnored(item.path, gitignorePatterns, customExcludes)) return false;
        return true;
    });

    const files: FileEntry[] = [];
    const total = filesToFetch.length;
    let fetched = 0;

    // Fetch in batches of 10 for performance
    const BATCH = 10;
    for (let i = 0; i < filesToFetch.length; i += BATCH) {
        const batch = filesToFetch.slice(i, i + BATCH);
        const results = await Promise.all(
            batch.map(async (item) => {
                try {
                    const content = await fetchFileContent(owner, repo, item.path, branch, token);
                    fetched++;
                    progressCallback?.(t('ghFetchingFiles', { fetched: String(fetched), total: String(total) }));
                    return {
                        name: item.path.split('/').pop()!,
                        path: item.path,
                        content,
                        size: item.size || new Blob([content]).size,
                        source: 'github',
                    } as FileEntry;
                } catch {
                    fetched++;
                    progressCallback?.(t('ghFetchingFiles', { fetched: String(fetched), total: String(total) }));
                    return null;
                }
            })
        );
        files.push(...results.filter((f): f is FileEntry => f !== null));
    }

    return files;
}

/* ── Parse owner/repo from URL or shorthand ── */

export function parseRepoInput(input: string): { owner: string; repo: string } | null {
    input = input.trim();
    // Handle full URL: https://github.com/owner/repo
    const urlMatch = input.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
    // Handle owner/repo shorthand
    const shortMatch = input.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
    return null;
}

/* ── GitHub settings modal ── */

let _currentExcludes: string[] = [];

export async function showGitHubModal(existingConfig?: GitHubConfig): Promise<void> {
    const repoValue = existingConfig ? `${existingConfig.owner}/${existingConfig.repo}` : '';
    const tokenValue = existingConfig?.token || '';
    _currentExcludes = existingConfig?.customExcludes || [];
    const branchValue = existingConfig?.branch || '';

    const result = await showModal({
        title: t('ghSetup'),
        modalClass: 'modal--large',
        body: `
            <div class="modal-form-group">
                <label>${escapeHtml(t('ghRepo'))}</label>
                <input class="modal-input" type="text" data-role="gh-repo" value="${escapeHtml(repoValue)}" placeholder="owner/repo ${escapeHtml(t('ghRepoPlaceholder'))}">
            </div>
            <div class="modal-form-group">
                <label>${escapeHtml(t('ghToken'))}</label>
                <input class="modal-input" type="password" data-role="gh-token" value="${escapeHtml(tokenValue)}" placeholder="${escapeHtml(t('ghTokenPlaceholder'))}">
                <span class="modal-hint">${escapeHtml(t('ghTokenHint'))}</span>
            </div>
            <div class="modal-form-row-inline">
                <div class="modal-form-group" style="flex:1">
                    <label>${escapeHtml(t('ghBranch'))}</label>
                    <div class="gh-branch-row">
                        <input class="modal-input" type="text" data-role="gh-branch" value="${escapeHtml(branchValue)}" placeholder="main">
                        <button class="btn btn-secondary btn-sm gh-load-branches" data-role="gh-load-branches" type="button">${escapeHtml(t('ghLoadBranches'))}</button>
                    </div>
                </div>
            </div>
            <div class="gh-branch-list" data-role="gh-branch-list" style="display:none"></div>
            <div class="modal-form-group">
                <label>${escapeHtml(t('ghExcludes'))}</label>
                <button class="btn btn-secondary btn-sm gh-load-folders" data-role="gh-load-folders" type="button">${escapeHtml(t('ghLoadFolders'))}</button>
                <div class="gh-folder-tree" data-role="gh-folder-tree" style="display:none"></div>
                <span class="modal-hint">${escapeHtml(t('ghExcludesHint'))}</span>
            </div>
        `,
        confirmText: existingConfig ? t('ghSync') : t('ghConnect'),
        confirmClass: 'btn-primary',
        secondaryConfirmText: existingConfig ? t('save') : '',
        secondaryConfirmClass: 'btn-secondary',
        validate: (overlay) => {
            const repoInput = (overlay.querySelector('[data-role="gh-repo"]') as HTMLInputElement).value;
            if (!parseRepoInput(repoInput)) return t('ghInvalidRepo');
            return null;
        },
        resolveData: (overlay) => {
            return { ...collectGitHubFormData(overlay), _action: 'sync' };
        },
        resolveSecondaryData: (overlay) => {
            return { ...collectGitHubFormData(overlay), _action: 'save' };
        },
    }) as (GitHubConfig & { _action: string }) | null;

    if (!result) return;

    const action = result._action;
    const config: GitHubConfig = {
        owner: result.owner,
        repo: result.repo,
        branch: result.branch,
        token: result.token,
        customExcludes: result.customExcludes,
    };

    if (action === 'save') {
        await saveConfigOnly(config);
    } else {
        await performSync(config);
    }
}

function collectGitHubFormData(overlay: HTMLElement): GitHubConfig {
    const repoInput = (overlay.querySelector('[data-role="gh-repo"]') as HTMLInputElement).value;
    const token = (overlay.querySelector('[data-role="gh-token"]') as HTMLInputElement).value.trim();
    const branch = (overlay.querySelector('[data-role="gh-branch"]') as HTMLInputElement).value.trim() || 'main';
    const checkboxes = overlay.querySelectorAll<HTMLInputElement>('[data-role="gh-folder-tree"] input[type="checkbox"]:checked');
    const customExcludes = Array.from(checkboxes).map(cb => cb.dataset.folder!).filter(Boolean);
    const parsed = parseRepoInput(repoInput)!;
    return { owner: parsed.owner, repo: parsed.repo, token, branch, customExcludes };
}

async function saveConfigOnly(config: GitHubConfig): Promise<void> {
    if (!state.currentProjectId) return;
    const project = await getProject(state.currentProjectId);
    if (!project) return;
    project.github = config;
    await saveProject(project);
    updateGitHubStatus(config);
    await renderProjectList();
    toast(t('ghConfigSaved'), 'success');
}

/* ── Branch loading via event delegation ── */

document.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('[data-role="gh-load-branches"]');
    if (!btn) return;

    const overlay = btn.closest('.modal-overlay');
    if (!overlay) return;

    const repoInput = (overlay.querySelector('[data-role="gh-repo"]') as HTMLInputElement).value;
    const token = (overlay.querySelector('[data-role="gh-token"]') as HTMLInputElement).value.trim();
    const branchList = overlay.querySelector('[data-role="gh-branch-list"]') as HTMLElement;
    const branchInput = overlay.querySelector('[data-role="gh-branch"]') as HTMLInputElement;

    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
        toast(t('ghInvalidRepo'));
        return;
    }

    (btn as HTMLButtonElement).disabled = true;
    (btn as HTMLButtonElement).textContent = t('loading');

    try {
        const branches = await fetchBranches(parsed.owner, parsed.repo, token || undefined);
        branchList.innerHTML = branches.map(b =>
            `<button class="gh-branch-chip${b === branchInput.value ? ' active' : ''}" data-branch="${escapeHtml(b)}">${escapeHtml(b)}</button>`
        ).join('');
        branchList.style.display = 'flex';

        branchList.querySelectorAll('.gh-branch-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                branchInput.value = (chip as HTMLElement).dataset.branch!;
                branchList.querySelectorAll('.gh-branch-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });
    } catch (err) {
        toast((err as Error).message);
    } finally {
        (btn as HTMLButtonElement).disabled = false;
        (btn as HTMLButtonElement).textContent = t('ghLoadBranches');
    }
});

/* ── Folder tree loading via event delegation ── */

document.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('[data-role="gh-load-folders"]');
    if (!btn) return;

    const overlay = btn.closest('.modal-overlay');
    if (!overlay) return;

    const repoInput = (overlay.querySelector('[data-role="gh-repo"]') as HTMLInputElement).value;
    const token = (overlay.querySelector('[data-role="gh-token"]') as HTMLInputElement).value.trim();
    const branchInput = (overlay.querySelector('[data-role="gh-branch"]') as HTMLInputElement).value.trim() || 'main';
    const folderTree = overlay.querySelector('[data-role="gh-folder-tree"]') as HTMLElement;

    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
        toast(t('ghInvalidRepo'));
        return;
    }

    (btn as HTMLButtonElement).disabled = true;
    (btn as HTMLButtonElement).textContent = t('loading');

    try {
        const entries = await fetchTreeEntries(parsed.owner, parsed.repo, branchInput, token || undefined);
        renderFolderTree(folderTree, entries, _currentExcludes);
        folderTree.style.display = 'block';
    } catch (err) {
        toast((err as Error).message);
    } finally {
        (btn as HTMLButtonElement).disabled = false;
        (btn as HTMLButtonElement).textContent = t('ghLoadFolders');
    }
});

/* ── Folder tree toggle via event delegation ── */

document.addEventListener('click', (e) => {
    const toggle = (e.target as HTMLElement).closest('.gh-tree-toggle');
    if (!toggle) return;
    e.preventDefault();
    e.stopPropagation();
    const li = toggle.closest('.gh-tree-item') as HTMLElement;
    if (!li) return;
    li.classList.toggle('collapsed');
});

/* ── Folder tree checkbox cascading ── */

document.addEventListener('change', (e) => {
    const cb = e.target as HTMLInputElement;
    if (!cb.matches('[data-role="gh-folder-tree"] input[type="checkbox"]')) return;
    // Cascade to children
    const li = cb.closest('.gh-tree-item') as HTMLElement;
    if (!li) return;
    const childCheckboxes = li.querySelectorAll<HTMLInputElement>(':scope > .gh-tree-children input[type="checkbox"]');
    childCheckboxes.forEach(child => { child.checked = cb.checked; });
    // Update parent states
    updateParentCheckboxes(cb);
});

function updateParentCheckboxes(cb: HTMLInputElement): void {
    const parentChildren = cb.closest('.gh-tree-children');
    if (!parentChildren) return;
    const parentLi = parentChildren.closest('.gh-tree-item') as HTMLElement;
    if (!parentLi) return;
    const parentCb = parentLi.querySelector<HTMLInputElement>(':scope > label input[type="checkbox"]');
    if (!parentCb) return;
    const siblings = parentChildren.querySelectorAll<HTMLInputElement>(':scope > .gh-tree-item > label input[type="checkbox"]');
    const allChecked = Array.from(siblings).every(s => s.checked);
    const someChecked = Array.from(siblings).some(s => s.checked);
    parentCb.checked = allChecked;
    parentCb.indeterminate = !allChecked && someChecked;
    updateParentCheckboxes(parentCb);
}

/* ── Build folder tree HTML ── */

interface TreeNode {
    name: string;
    path: string;
    isFile: boolean;
    children: Map<string, TreeNode>;
}

function buildTreeFromEntries(entries: TreeEntry[]): TreeNode {
    const root: TreeNode = { name: '', path: '', isFile: false, children: new Map() };
    for (const entry of entries) {
        const parts = entry.path.split('/');
        let current = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const pathSoFar = parts.slice(0, i + 1).join('/');
            const isLast = i === parts.length - 1;
            if (!current.children.has(part)) {
                current.children.set(part, {
                    name: part,
                    path: pathSoFar,
                    isFile: isLast && entry.type === 'blob',
                    children: new Map(),
                });
            }
            current = current.children.get(part)!;
        }
    }
    return root;
}

function renderFolderTree(container: HTMLElement, entries: TreeEntry[], excludes: string[]): void {
    const root = buildTreeFromEntries(entries);
    container.innerHTML = '';

    function renderNode(node: TreeNode, depth: number): HTMLElement {
        const el = document.createElement('div');
        el.className = 'gh-tree-item';
        if (!node.isFile && depth > 0) el.classList.add('collapsed');

        const hasChildren = node.children.size > 0;
        const isExcluded = excludes.includes(node.path);

        const label = document.createElement('label');
        label.className = 'gh-tree-label' + (node.isFile ? ' gh-tree-label--file' : '');
        label.style.paddingLeft = (depth * 18 + 4) + 'px';

        // Toggle arrow for directories with children
        if (hasChildren) {
            const toggle = document.createElement('span');
            toggle.className = 'gh-tree-toggle';
            toggle.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>`;
            label.appendChild(toggle);
        } else {
            const spacer = document.createElement('span');
            spacer.className = 'gh-tree-spacer';
            label.appendChild(spacer);
        }

        // Checkbox
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.dataset.folder = node.path;
        cb.checked = isExcluded;
        label.appendChild(cb);

        // Icon
        if (node.isFile) {
            const ext = node.name.split('.').pop()?.toLowerCase() || '';
            const extLabel = ext.toUpperCase().slice(0, 4);
            const color = getExtColor(ext);
            const icon = document.createElement('span');
            icon.className = 'gh-tree-file-icon';
            icon.style.background = color + '22';
            icon.style.color = color;
            icon.style.borderColor = color + '44';
            icon.textContent = extLabel;
            label.appendChild(icon);
        } else {
            const icon = document.createElement('span');
            icon.className = 'gh-tree-folder-icon';
            icon.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
            label.appendChild(icon);
        }

        // Name — original casing preserved from the API
        const nameSpan = document.createElement('span');
        nameSpan.className = 'gh-tree-name';
        nameSpan.textContent = node.name;
        label.appendChild(nameSpan);

        el.appendChild(label);

        if (hasChildren) {
            const childrenEl = document.createElement('div');
            childrenEl.className = 'gh-tree-children';
            // Sort: directories first, then files, alphabetical within each group
            const sorted = [...node.children.values()].sort((a, b) => {
                if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
                return a.name.localeCompare(b.name);
            });
            for (const child of sorted) {
                childrenEl.appendChild(renderNode(child, depth + 1));
            }
            el.appendChild(childrenEl);
        }

        // If this node is excluded, cascade to children
        if (isExcluded && hasChildren) {
            el.querySelectorAll<HTMLInputElement>(':scope > .gh-tree-children input[type="checkbox"]').forEach(c => { c.checked = true; });
        }

        return el;
    }

    const sorted = [...root.children.values()].sort((a, b) => {
        if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
        return a.name.localeCompare(b.name);
    });
    for (const child of sorted) {
        container.appendChild(renderNode(child, 0));
    }
}

/* ── Perform sync ── */

async function performSync(config: GitHubConfig): Promise<void> {
    if (!state.currentProjectId) return;

    // Show progress overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay visible';
    overlay.innerHTML = `
        <div class="modal gh-progress-modal">
            <div class="modal-title">${escapeHtml(t('ghSyncing'))}</div>
            <div class="gh-progress-text" data-role="gh-progress">${escapeHtml(t('ghFetchingTree'))}</div>
            <div class="gh-progress-bar"><div class="gh-progress-fill"></div></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const progressEl = overlay.querySelector('[data-role="gh-progress"]') as HTMLElement;

    try {
        const files = await syncFromGitHub(config, (msg) => {
            progressEl.textContent = msg;
        });

        // Preserve manually added files and custom texts at their positions
        const preserved: { file: FileEntry, index: number }[] = [];
        state.files.forEach((f, i) => {
            if (f.isCustomText || f.source === 'manual') {
                preserved.push({ file: f, index: i });
            }
        });

        // Build new array: start with github files, then re-insert preserved at original positions
        const result: FileEntry[] = [...files];
        preserved.sort((a, b) => a.index - b.index);
        for (const entry of preserved) {
            const targetIndex = Math.min(entry.index, result.length);
            result.splice(targetIndex, 0, entry.file);
        }
        state.files = result;

        // Save GitHub config to project
        const project = await getProject(state.currentProjectId);
        if (project) {
            project.github = config;
            project.files = state.files.map(f => {
                const obj: FileEntry = { name: f.name, path: f.path, content: f.content, size: f.size };
                if (f.pdfData) obj.pdfData = f.pdfData;
                if (f.source) obj.source = f.source;
                if (f.isCustomText) {
                    obj.isCustomText = true;
                    obj.customTitle = f.customTitle;
                    obj.includeTitle = f.includeTitle;
                }
                return obj;
            });
            await saveProject(project);
        }

        renderFileList();
        updateGitHubStatus(config);
        await renderProjectList();
        toast(t('ghSyncDone', { count: String(files.length) }), 'success');
    } catch (err) {
        toast((err as Error).message);
    } finally {
        overlay.classList.remove('visible');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
        // Fallback removal
        setTimeout(() => overlay.remove(), 500);
    }
}

/* ── Quick sync (re-fetch with existing config) ── */

export async function quickSync(): Promise<void> {
    if (!state.currentProjectId) return;
    const project = await getProject(state.currentProjectId);
    if (!project?.github) {
        await showGitHubModal();
        return;
    }
    await performSync(project.github);
}

/* ── Get current project's GitHub config ── */

export async function getCurrentGitHubConfig(): Promise<GitHubConfig | undefined> {
    if (!state.currentProjectId) return undefined;
    const project = await getProject(state.currentProjectId);
    return project?.github;
}