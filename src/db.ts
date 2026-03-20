const DB_NAME = 'fmerge';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

export interface FileEntry {
    name: string;
    path: string;
    content: string | null;
    size: number;
    pdfData?: string;
    _file?: File;
    isCustomText?: boolean;
    customTitle?: string;
    includeTitle?: boolean;
    source?: 'github' | 'manual';
}

export interface GitHubConfig {
    owner: string;
    repo: string;
    branch: string;
    token?: string;
    customExcludes: string[];
}

export interface Project {
    id: string;
    name: string;
    files: FileEntry[];
    github?: GitHubConfig;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function getAllProjects(): Promise<Project[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function getProject(id: string): Promise<Project | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function saveProject(project: Project): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(project);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function deleteProjectFromDB(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}