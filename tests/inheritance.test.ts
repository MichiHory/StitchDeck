import { describe, it, expect } from 'vitest';
import type { FileEntry, Project } from '../src/db';
import {
    ensureEntryIds, buildOwnItems, buildSubItems,
    applyItemsToProject, detachProject, resetSubItems, visibleEntries,
} from '../src/inheritance';

function fe(id: string, path: string, extra: Partial<FileEntry> = {}): FileEntry {
    return { id, name: path.split('/').pop() || path, path, content: `content of ${path}`, size: 10, ...extra };
}

function mainProject(): Project {
    return { id: 'M', name: 'Main', files: [fe('a', 'src/a.ts'), fe('b', 'src/b.ts'), fe('c', 'notes.md')] };
}

describe('ensureEntryIds', () => {
    it('assigns ids to entries that lack them and reports change', () => {
        const p: Project = { id: 'P', name: 'P', files: [{ name: 'x', path: 'x', content: '', size: 0 } as unknown as FileEntry] };
        expect(ensureEntryIds(p)).toBe(true);
        expect(p.files[0].id).toBeTruthy();
        expect(ensureEntryIds(p)).toBe(false);
    });
});

describe('buildOwnItems', () => {
    it('maps files 1:1 with hidden flag', () => {
        const p = mainProject();
        p.files[1].hidden = true;
        const items = buildOwnItems(p);
        expect(items).toHaveLength(3);
        expect(items[0].origin).toBe('own');
        expect(items[1].hidden).toBe(true);
        expect(items[0].entry).toBe(p.files[0]);
    });
});

describe('buildSubItems', () => {
    it('fills an empty layout from main order (new sub)', () => {
        const main = mainProject();
        const sub: Project = { id: 'S', name: 'Sub', files: [], parentId: 'M', layout: [] };
        const items = buildSubItems(sub, main);
        expect(items.map(i => i.entry.id)).toEqual(['a', 'b', 'c']);
        expect(items.every(i => i.origin === 'inherited')).toBe(true);
    });

    it('resolves overrides and own entries from layout', () => {
        const main = mainProject();
        const own = fe('o1', 'src/b.ts', { source: 'manual' });
        const ownText = fe('o2', '', { isCustomText: true, customTitle: 'Task' });
        const sub: Project = {
            id: 'S', name: 'Sub', files: [own, ownText], parentId: 'M',
            layout: [
                { inheritedId: 'a' },
                { inheritedId: 'b', ownId: 'o1', hidden: true },
                { ownId: 'o2' },
                { inheritedId: 'c' },
            ],
        };
        const items = buildSubItems(sub, main);
        expect(items.map(i => i.origin)).toEqual(['inherited', 'override', 'own', 'inherited']);
        expect(items[1].entry).toBe(own);
        expect(items[1].hidden).toBe(true);
        expect(items[1].inheritedId).toBe('b');
    });

    it('inserts a new main entry after its main-order predecessor', () => {
        const main = mainProject();
        main.files.splice(1, 0, fe('new', 'src/new.ts')); // a, new, b, c
        const sub: Project = {
            id: 'S', name: 'Sub', files: [], parentId: 'M',
            // user moved c to front
            layout: [{ inheritedId: 'c' }, { inheritedId: 'a' }, { inheritedId: 'b' }],
        };
        const items = buildSubItems(sub, main);
        expect(items.map(i => i.entry.id)).toEqual(['c', 'a', 'new', 'b']);
    });

    it('inserts a new first main entry at the start', () => {
        const main = mainProject();
        main.files.unshift(fe('first', 'src/first.ts'));
        const sub: Project = { id: 'S', name: 'Sub', files: [], parentId: 'M', layout: [{ inheritedId: 'a' }, { inheritedId: 'b' }, { inheritedId: 'c' }] };
        const items = buildSubItems(sub, main);
        expect(items[0].entry.id).toBe('first');
    });

    it('drops slots of deleted main entries, converts orphaned overrides to own', () => {
        const main = mainProject();
        main.files = main.files.filter(f => f.id !== 'a' && f.id !== 'b'); // delete a, b
        const own = fe('o1', 'src/b.ts');
        const sub: Project = {
            id: 'S', name: 'Sub', files: [own], parentId: 'M',
            layout: [{ inheritedId: 'a' }, { inheritedId: 'b', ownId: 'o1', hidden: true }, { inheritedId: 'c' }],
        };
        const items = buildSubItems(sub, main);
        expect(items.map(i => i.entry.id)).toEqual(['o1', 'c']);
        expect(items[0].origin).toBe('own');
        expect(items[0].inheritedId).toBeUndefined();
        expect(items[0].hidden).toBe(true); // slot property survives
    });

    it('ignores hidden flag of the main project entries (eye is per-project)', () => {
        const main = mainProject();
        main.files[0].hidden = true;
        const sub: Project = { id: 'S', name: 'Sub', files: [], parentId: 'M', layout: [] };
        const items = buildSubItems(sub, main);
        expect(items[0].hidden).toBe(false);
    });
});

describe('applyItemsToProject', () => {
    it('round-trips a subproject through items', () => {
        const main = mainProject();
        const own = fe('o1', 'src/b.ts');
        const sub: Project = {
            id: 'S', name: 'Sub', files: [own], parentId: 'M',
            layout: [{ inheritedId: 'a', hidden: true }, { inheritedId: 'b', ownId: 'o1' }, { inheritedId: 'c' }],
        };
        const items = buildSubItems(sub, main);
        applyItemsToProject(items, sub);
        expect(sub.files).toEqual([own]);
        expect(sub.layout).toEqual([
            { inheritedId: 'a', hidden: true },
            { inheritedId: 'b', ownId: 'o1' },
            { inheritedId: 'c' },
        ]);
        // and back again
        expect(buildSubItems(sub, main).map(i => i.origin)).toEqual(['inherited', 'override', 'inherited']);
    });

    it('persists hidden onto entries for main/standalone projects and clears layout', () => {
        const p = mainProject();
        const items = buildOwnItems(p);
        items[2].hidden = true;
        applyItemsToProject(items, p);
        expect(p.files[2].hidden).toBe(true);
        expect(p.files[0].hidden).toBeUndefined();
        expect(p.layout).toBeUndefined();
    });
});

describe('detachProject', () => {
    it('materializes inherited entries with fresh ids and keeps sub order/visibility', () => {
        const main = mainProject();
        const own = fe('o1', 'src/b.ts');
        const sub: Project = {
            id: 'S', name: 'Sub', files: [own], parentId: 'M',
            layout: [{ inheritedId: 'c', hidden: true }, { inheritedId: 'b', ownId: 'o1' }, { inheritedId: 'a' }],
        };
        const items = buildSubItems(sub, main);
        detachProject(sub, items);
        expect(sub.parentId).toBeUndefined();
        expect(sub.layout).toBeUndefined();
        expect(sub.files.map(f => f.path)).toEqual(['notes.md', 'src/b.ts', 'src/a.ts']);
        expect(sub.files[0].hidden).toBe(true);
        expect(sub.files[0].id).not.toBe('c'); // fresh id, no collision with main
        expect(sub.files[1]).toBe(own);
        // main untouched
        expect(main.files).toHaveLength(3);
    });
});

describe('resetSubItems', () => {
    it('returns all-visible inherited items in main order', () => {
        const main = mainProject();
        const items = resetSubItems(main);
        expect(items.map(i => i.entry.id)).toEqual(['a', 'b', 'c']);
        expect(items.every(i => i.origin === 'inherited' && !i.hidden)).toBe(true);
    });
});

describe('visibleEntries', () => {
    it('filters hidden items', () => {
        const p = mainProject();
        const items = buildOwnItems(p);
        items[1].hidden = true;
        expect(visibleEntries(items).map(e => e.id)).toEqual(['a', 'c']);
    });
});

describe('applyItemsToProject — orphaned override round-trip', () => {
    it('persists a converted own entry with hidden and no inheritedId, stable across rebuilds', () => {
        const main = mainProject();
        main.files = main.files.filter(f => f.id !== 'b');
        const own = fe('o1', 'src/b.ts');
        const sub: Project = {
            id: 'S', name: 'Sub', files: [own], parentId: 'M',
            layout: [{ inheritedId: 'a' }, { inheritedId: 'b', ownId: 'o1', hidden: true }, { inheritedId: 'c' }],
        };
        const items = buildSubItems(sub, main);
        applyItemsToProject(items, sub);
        expect(sub.layout).toEqual([
            { inheritedId: 'a' },
            { ownId: 'o1', hidden: true },
            { inheritedId: 'c' },
        ]);
        const again = buildSubItems(sub, main);
        expect(again.map(i => i.origin)).toEqual(['inherited', 'own', 'inherited']);
        expect(again[1].hidden).toBe(true);
    });
});