import type { Project } from './db';
import type { ListItem } from './inheritance';

export const MAX_DISPLAY_LINES = 20000;

export type ViewMode = 'list' | 'tiles' | 'tree';

export const state = {
    items: [] as ListItem[],
    parentProject: null as Project | null,
    fullMergedContent: '',
    dragSrcIndex: null as number | null,
    renderGeneration: 0,
    currentProjectId: null as string | null,
    saveTimeout: null as ReturnType<typeof setTimeout> | null,
    viewMode: (localStorage.getItem('stitchdeck_viewMode') as ViewMode) || 'tiles' as ViewMode,
};