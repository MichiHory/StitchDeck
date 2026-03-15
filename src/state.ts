import type { FileEntry } from './db';

export const MAX_DISPLAY_LINES = 20000;

export const state = {
    files: [] as FileEntry[],
    fullMergedContent: '',
    dragSrcIndex: null as number | null,
    renderGeneration: 0,
    currentProjectId: null as string | null,
    saveTimeout: null as ReturnType<typeof setTimeout> | null,
};