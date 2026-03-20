import { state } from './state';
import { getAllProjects, getProject, saveProject, deleteProjectFromDB, generateId } from './db';
import type { FileEntry } from './db';
import { escapeHtml, readFile } from './helpers';
import { t, getCurrentLang } from './i18n';
import { showModal } from './modal';
import { toast } from './toast';
import { renderFileList } from './file-list';
import {
    projectListEl, outputContent, lineNumbers,
    outputSection, truncationWarning,
    ghStatusBar, ghStatusRepo, ghStatusBranch,
} from './dom';

export function scheduleSave(): void {
    if (state.saveTimeout) clearTimeout(state.saveTimeout);
    state.saveTimeout = setTimeout(() => persistCurrentProject(), 300);
}

export async function persistCurrentProject(): Promise<void> {
    if (!state.currentProjectId) return;
    for (const entry of state.files) {
        if (entry.content === null && entry._file) {
            entry.content = await readFile(entry._file);
            entry.size = entry._file.size;
        }
    }
    const project = await getProject(state.currentProjectId);
    if (!project) return;
    project.files = state.files.map(f => {
        const obj: FileEntry = { name: f.name, path: f.path, content: f.content, size: f.size };
        if (f.pdfData) obj.pdfData = f.pdfData;
        if (f.isCustomText) {
            obj.isCustomText = true;
            obj.customTitle = f.customTitle;
            obj.includeTitle = f.includeTitle;
        }
        return obj;
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
    const project = await getProject(id);
    if (!project) return;
    state.currentProjectId = id;
    localStorage.setItem('fmerge_activeProject', id);
    state.files = (project.files || []).map(f => {
        const obj: FileEntry = { name: f.name, path: f.path, content: f.content, size: f.size };
        if (f.pdfData) obj.pdfData = f.pdfData;
        if (f.isCustomText) {
            obj.isCustomText = true;
            obj.customTitle = f.customTitle;
            obj.includeTitle = f.includeTitle;
        }
        return obj;
    });
    state.fullMergedContent = '';
    outputContent.innerHTML = '';
    lineNumbers.textContent = '';
    outputSection.style.display = 'none';
    truncationWarning.classList.remove('visible');
    updateGitHubStatus(project.github);
    renderFileList();
}

export async function renderProjectList(): Promise<void> {
    const projects = await getAllProjects();
    projectListEl.innerHTML = '';
    projects.sort((a, b) => a.name.localeCompare(b.name, getCurrentLang()));
    for (const p of projects) {
        const el = document.createElement('div');
        el.className = 'project-item' + (p.id === state.currentProjectId ? ' active' : '');
        el.innerHTML = `
            <span class="project-name">${escapeHtml(p.name)}</span>
            <span class="project-actions">
                <button class="project-action-btn rename-btn" title="${escapeHtml(t('rename'))}">✎</button>
                <button class="project-action-btn danger delete-btn" title="${escapeHtml(t('delete'))}">✕</button>
            </span>
        `;
        el.addEventListener('click', async (e) => {
            if ((e.target as HTMLElement).closest('.project-action-btn')) return;
            if (p.id === state.currentProjectId) return;
            await persistCurrentProject();
            await switchToProject(p.id);
            await renderProjectList();
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
            if (projects.length <= 1) {
                toast(t('cannotDeleteLast'));
                return;
            }
            const confirmed = await showModal({
                title: t('deleteProject'),
                body: t('deleteProjectConfirm', { name: escapeHtml(p.name) }),
                confirmText: t('delete'),
                confirmClass: 'btn-danger',
            });
            if (!confirmed) return;
            await deleteProjectFromDB(p.id);
            if (p.id === state.currentProjectId) {
                const remaining = await getAllProjects();
                state.currentProjectId = remaining[0].id;
                localStorage.setItem('fmerge_activeProject', state.currentProjectId);
                await switchToProject(state.currentProjectId);
            }
            await renderProjectList();
            toast(t('projectDeleted'), 'success');
        });
        projectListEl.appendChild(el);
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
    const id = generateId();
    await saveProject({ id, name, files: [] });
    state.currentProjectId = id;
    localStorage.setItem('fmerge_activeProject', id);
    state.files = [];
    state.fullMergedContent = '';
    outputContent.innerHTML = '';
    lineNumbers.textContent = '';
    outputSection.style.display = 'none';
    truncationWarning.classList.remove('visible');
    renderFileList();
    await renderProjectList();
    toast(t('projectCreated', { name: name.trim() }), 'success');
}

export async function initProjects(): Promise<void> {
    const projects = await getAllProjects();
    if (projects.length === 0) {
        const id = generateId();
        await saveProject({ id, name: t('defaultProject'), files: [] });
        state.currentProjectId = id;
        localStorage.setItem('fmerge_activeProject', id);
    } else {
        const savedId = localStorage.getItem('fmerge_activeProject');
        const exists = projects.find(p => p.id === savedId);
        state.currentProjectId = exists ? savedId : projects[0].id;
        localStorage.setItem('fmerge_activeProject', state.currentProjectId!);
    }
    await renderProjectList();
    await switchToProject(state.currentProjectId!);
}