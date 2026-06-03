import { state } from './state';
import { getAllProjects, getProject, saveProject, deleteProjectFromDB, generateId } from './db';
import type { Project } from './db';
import { buildOwnItems, buildSubItems, applyItemsToProject, ensureEntryIds, detachProject } from './inheritance';
import { escapeHtml, readFile } from './helpers';
import { t, getCurrentLang } from './i18n';
import { showModal } from './modal';
import { toast } from './toast';
import { renderFileList } from './file-list';
import { isHelpVisible, hideHelp } from './help';
import {
    projectListEl, outputContent, lineNumbers,
    outputSection, truncationWarning,
    ghStatusBar, ghStatusRepo, ghStatusBranch,
    noProject, fileListWrapper, dropzone, mainActions, mergeOptions,
} from './dom';

export function showNoProjectState(): void {
    noProject.style.display = '';
    fileListWrapper.style.display = 'none';
    dropzone.style.display = 'none';
    mainActions.style.display = 'none';
    mergeOptions.style.display = 'none';
    outputSection.style.display = 'none';
    ghStatusBar.style.display = 'none';
}

export function hideNoProjectState(): void {
    noProject.style.display = 'none';
    fileListWrapper.style.display = '';
}

export function scheduleSave(): void {
    if (state.saveTimeout) clearTimeout(state.saveTimeout);
    state.saveTimeout = setTimeout(() => persistCurrentProject(), 300);
}

export async function persistCurrentProject(): Promise<void> {
    if (!state.currentProjectId) return;
    for (const item of state.items) {
        const entry = item.entry;
        if (item.origin !== 'inherited' && entry.content === null && entry._file) {
            entry.content = await readFile(entry._file);
            entry.size = entry._file.size;
        }
    }
    const project = await getProject(state.currentProjectId);
    if (!project) return;
    applyItemsToProject(state.items, project);
    // Strip runtime-only fields before persisting
    project.files = project.files.map(f => {
        const { _file, ...rest } = f;
        void _file;
        return rest;
    });
    await saveProject(project);
}

export function updateGitHubStatus(github?: import('./db').GitHubConfig): void {
    if (github) {
        ghStatusBar.style.display = 'flex';
        ghStatusRepo.textContent = `${github.owner}/${github.repo}`;
        ghStatusBranch.textContent = github.branch;
    } else {
        ghStatusBar.style.display = 'none';
        ghStatusRepo.textContent = '';
        ghStatusBranch.textContent = '';
    }
}

export async function switchToProject(id: string): Promise<void> {
    if (state.saveTimeout) {
        clearTimeout(state.saveTimeout);
        state.saveTimeout = null;
    }
    const project = await getProject(id);
    if (!project) return;
    hideNoProjectState();
    state.currentProjectId = id;
    localStorage.setItem('stitchdeck_activeProject', id);

    let parent: Project | null = null;
    if (project.parentId) {
        parent = (await getProject(project.parentId)) ?? null;
        if (!parent) {
            // Orphaned subproject (main vanished unexpectedly) — self-heal to standalone
            delete project.parentId;
            delete project.layout;
            await saveProject(project);
        }
    }
    state.parentProject = parent;
    state.items = parent ? buildSubItems(project, parent) : buildOwnItems(project);
    if (parent) {
        // Persist the reconciled layout so it is stable from now on
        applyItemsToProject(state.items, project);
        await saveProject(project);
    }

    state.fullMergedContent = '';
    outputContent.innerHTML = '';
    lineNumbers.textContent = '';
    outputSection.style.display = 'none';
    truncationWarning.classList.remove('visible');
    updateGitHubStatus(project.github);
    renderFileList();
}

/* ── Sidebar collapse state ── */
const COLLAPSED_KEY = 'stitchdeck_collapsedMains';

function getCollapsed(): Set<string> {
    try {
        return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]') as string[]);
    } catch {
        return new Set();
    }
}

function setCollapsed(collapsed: Set<string>): void {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
}

export async function createSubproject(parent: Project): Promise<void> {
    const name = await showModal({
        title: t('newSubprojectTitle', { name: parent.name }),
        showInput: true,
        placeholder: t('projectNamePlaceholder'),
        confirmText: t('create'),
    }) as string | null;
    if (!name) return;
    const id = generateId();
    await saveProject({ id, name, files: [], parentId: parent.id, layout: [] });
    await switchToProject(id);
    await renderProjectList();
    toast(t('subprojectCreated', { name: name.trim() }), 'success');
}

async function detachSubproject(subId: string): Promise<void> {
    const sub = await getProject(subId);
    if (!sub?.parentId) return;
    const main = await getProject(sub.parentId);
    if (subId === state.currentProjectId) await persistCurrentProject();
    const fresh = (await getProject(subId))!;
    const items = main ? buildSubItems(fresh, main) : buildOwnItems(fresh);
    detachProject(fresh, items);
    await saveProject(fresh);
    if (subId === state.currentProjectId) await switchToProject(subId);
    await renderProjectList();
    toast(t('detached', { name: fresh.name }), 'success');
}

function renderProjectRow(p: Project, subs: Project[], collapsed: Set<string>): HTMLElement {
    const isSub = !!p.parentId;
    const hasSubs = subs.length > 0;
    const isCollapsed = collapsed.has(p.id);
    const el = document.createElement('div');
    el.className = 'project-item'
        + (p.id === state.currentProjectId ? ' active' : '')
        + (isSub ? ' project-item--sub' : '');
    el.innerHTML = `
        ${hasSubs ? `<button class="project-collapse${isCollapsed ? '' : ' open'}" title="${escapeHtml(t(isCollapsed ? 'expandSubprojects' : 'collapseSubprojects'))}">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>` : ''}
        <span class="project-name">${escapeHtml(p.name)}${hasSubs && isCollapsed ? ` <span class="project-sub-count">(${subs.length})</span>` : ''}</span>
        <span class="project-actions">
            ${!isSub ? `<button class="project-action-btn add-sub-btn" title="${escapeHtml(t('newSubproject'))}">+</button>` : ''}
            ${isSub ? `<button class="project-action-btn detach-btn" title="${escapeHtml(t('detachAction'))}">⇱</button>` : ''}
            <button class="project-action-btn rename-btn" title="${escapeHtml(t('rename'))}">✎</button>
            <button class="project-action-btn danger delete-btn" title="${escapeHtml(t('delete'))}">✕</button>
        </span>
    `;

    el.addEventListener('click', async (e) => {
        if ((e.target as HTMLElement).closest('.project-action-btn')) return;
        if ((e.target as HTMLElement).closest('.project-collapse')) return;
        if (isHelpVisible()) {
            hideHelp();
            if (p.id === state.currentProjectId) return;
        }
        if (p.id === state.currentProjectId) return;
        await persistCurrentProject();
        await switchToProject(p.id);
        await renderProjectList();
    });

    el.querySelector('.project-collapse')?.addEventListener('click', () => {
        const c = getCollapsed();
        if (c.has(p.id)) c.delete(p.id); else c.add(p.id);
        setCollapsed(c);
        void renderProjectList();
    });

    el.querySelector('.add-sub-btn')?.addEventListener('click', () => void createSubproject(p));

    el.querySelector('.detach-btn')?.addEventListener('click', async () => {
        const confirmed = await showModal({
            title: t('detachConfirmTitle'),
            body: t('detachConfirmBody', { name: escapeHtml(p.name) }),
            confirmText: t('detach'),
        });
        if (confirmed) await detachSubproject(p.id);
    });

    el.querySelector('.rename-btn')!.addEventListener('click', async () => {
        const name = await showModal({
            title: t('renameProject'),
            showInput: true,
            inputValue: p.name,
            confirmText: t('rename'),
        }) as string | null;
        if (!name || name === p.name) return;
        const project = await getProject(p.id);
        if (!project) return;
        project.name = name;
        await saveProject(project);
        await renderProjectList();
        toast(t('projectRenamed', { name }), 'success');
    });

    el.querySelector('.delete-btn')!.addEventListener('click', async () => {
        // Fix 3: flush pending edits before snapshot
        await persistCurrentProject();

        let cascade = false;
        // Re-fetch fresh data after confirm so any in-flight edits are captured
        const allBefore = await getAllProjects();
        const mySubsBefore = allBefore.filter(s => s.parentId === p.id);

        if (mySubsBefore.length > 0) {
            const choice = await showModal({
                title: t('deleteMainTitle'),
                body: `
                    <p>${t('deleteMainBody', { name: escapeHtml(p.name), count: mySubsBefore.length })}</p>
                    <label class="modal-radio"><input type="radio" name="delete-main-mode" value="detach" checked> ${escapeHtml(t('deleteMainDetach'))}</label>
                    <label class="modal-radio"><input type="radio" name="delete-main-mode" value="cascade"> ${escapeHtml(t('deleteMainCascade'))}</label>
                `,
                confirmText: t('delete'),
                confirmClass: 'btn-danger',
                resolveData: (overlay) =>
                    (overlay.querySelector('input[name="delete-main-mode"]:checked') as HTMLInputElement).value,
            }) as string | null;
            if (!choice) return;
            cascade = choice === 'cascade';
        } else {
            const confirmed = await showModal({
                title: t('deleteProject'),
                body: t('deleteProjectConfirm', { name: escapeHtml(p.name) }),
                confirmText: t('delete'),
                confirmClass: 'btn-danger',
            });
            if (!confirmed) return;
        }

        // Re-read fresh data after user confirmed (modal may have taken time; sub could have been edited)
        const all = await getAllProjects();
        const freshMain = all.find(x => x.id === p.id) ?? p;
        const mySubs = all.filter(s => s.parentId === p.id);

        for (const s of mySubs) {
            if (cascade) {
                await deleteProjectFromDB(s.id);
            } else {
                const items = buildSubItems(s, freshMain);
                detachProject(s, items);
                await saveProject(s);
            }
        }
        await deleteProjectFromDB(p.id);

        const wasCurrentDeleted = p.id === state.currentProjectId
            || (cascade && mySubs.some(s => s.id === state.currentProjectId));

        // Fix 1: if NOT cascade and the currently open project is one of the detached subs,
        // refresh state so UI no longer shows inherited badges or stale parentProject
        if (!cascade && !wasCurrentDeleted && mySubs.some(s => s.id === state.currentProjectId)) {
            await switchToProject(state.currentProjectId!);
        }
        if (wasCurrentDeleted) {
            const remaining = await getAllProjects();
            if (remaining.length > 0) {
                state.currentProjectId = remaining[0].id;
                localStorage.setItem('stitchdeck_activeProject', state.currentProjectId);
                await switchToProject(state.currentProjectId);
            } else {
                state.currentProjectId = null;
                state.items = [];
                state.parentProject = null;
                state.fullMergedContent = '';
                localStorage.removeItem('stitchdeck_activeProject');
                showNoProjectState();
            }
        }
        await renderProjectList();
        toast(t('projectDeleted'), 'success');
    });

    return el;
}

export async function renderProjectList(): Promise<void> {
    const projects = await getAllProjects();
    projectListEl.innerHTML = '';
    const byId = new Map(projects.map(p => [p.id, p]));
    const collapsed = getCollapsed();

    const subsByParent = new Map<string, Project[]>();
    const tops: Project[] = [];
    for (const p of projects) {
        if (p.parentId && byId.has(p.parentId)) {
            const arr = subsByParent.get(p.parentId) || [];
            arr.push(p);
            subsByParent.set(p.parentId, arr);
        } else {
            tops.push(p);
        }
    }
    const byName = (a: Project, b: Project) => a.name.localeCompare(b.name, getCurrentLang());
    tops.sort(byName);
    subsByParent.forEach(arr => arr.sort(byName));

    for (const p of tops) {
        const subs = subsByParent.get(p.id) || [];
        projectListEl.appendChild(renderProjectRow(p, subs, collapsed));
        if (subs.length && !collapsed.has(p.id)) {
            for (const s of subs) projectListEl.appendChild(renderProjectRow(s, [], collapsed));
        }
    }
}

export async function createNewProject(): Promise<void> {
    const name = await showModal({
        title: t('newProjectTitle'),
        showInput: true,
        placeholder: t('projectNamePlaceholder'),
        confirmText: t('create'),
    }) as string | null;
    if (!name) return;
    hideNoProjectState();
    const id = generateId();
    await saveProject({ id, name, files: [] });
    state.currentProjectId = id;
    localStorage.setItem('stitchdeck_activeProject', id);
    state.items = [];
    state.parentProject = null;
    state.fullMergedContent = '';
    outputContent.innerHTML = '';
    lineNumbers.textContent = '';
    outputSection.style.display = 'none';
    truncationWarning.classList.remove('visible');
    updateGitHubStatus(undefined);
    renderFileList();
    await renderProjectList();
    toast(t('projectCreated', { name: name.trim() }), 'success');
}

export async function initProjects(): Promise<void> {
    let projects = await getAllProjects();
    if (projects.length === 0) {
        const id = generateId();
        const name = t('defaultProject');
        await saveProject({ id, name, files: [] });
        state.currentProjectId = id;
        localStorage.setItem('stitchdeck_activeProject', id);
        state.items = [];
        projects = await getAllProjects();
    }

    for (const p of projects) {
        if (ensureEntryIds(p)) await saveProject(p);
    }
    const savedId = localStorage.getItem('stitchdeck_activeProject');
    const exists = projects.find(p => p.id === savedId);
    state.currentProjectId = exists ? savedId : projects[0].id;
    localStorage.setItem('stitchdeck_activeProject', state.currentProjectId!);
    await renderProjectList();
    await switchToProject(state.currentProjectId!);
}