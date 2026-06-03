import type { FileEntry, LayoutSlot, Project } from './db';
import { generateId } from './db';

export type Origin = 'own' | 'inherited' | 'override';

/** Runtime view of one list position. For 'inherited', entry IS the main project's object (treat as read-only). */
export interface ListItem {
    entry: FileEntry;
    origin: Origin;
    /** Id of the main-project entry this slot tracks (inherited + override items). */
    inheritedId?: string;
    hidden: boolean;
}

/** Lazy migration: give ids to legacy entries. Returns true if anything changed. */
export function ensureEntryIds(project: Project): boolean {
    let changed = false;
    for (const f of project.files) {
        if (!f.id) {
            f.id = generateId();
            changed = true;
        }
    }
    return changed;
}

/** Runtime list for a standalone/main project. */
export function buildOwnItems(project: Project): ListItem[] {
    return project.files.map(f => ({ entry: f, origin: 'own' as const, hidden: !!f.hidden }));
}

/**
 * Runtime list for a subproject, reconciled against its main project:
 * - dead inherited slots are dropped; orphaned overrides become own entries (keeping slot hidden/position)
 * - main entries missing from the layout are inserted after their nearest main-order predecessor present in the list
 * - the main project's own hidden flags are ignored (visibility is per-project)
 */
export function buildSubItems(sub: Project, main: Project): ListItem[] {
    const mainById = new Map(main.files.map(f => [f.id, f]));
    const ownById = new Map(sub.files.map(f => [f.id, f]));
    const items: ListItem[] = [];
    const seenMainIds = new Set<string>();
    const seenOwnIds = new Set<string>();

    for (const slot of sub.layout || []) {
        const own = slot.ownId ? ownById.get(slot.ownId) : undefined;
        const inheritedAlive = !!slot.inheritedId && mainById.has(slot.inheritedId);
        if (own) {
            seenOwnIds.add(own.id);
            if (inheritedAlive) {
                seenMainIds.add(slot.inheritedId!);
                items.push({ entry: own, origin: 'override', inheritedId: slot.inheritedId, hidden: !!slot.hidden });
            } else {
                items.push({ entry: own, origin: 'own', hidden: !!slot.hidden });
            }
        } else if (inheritedAlive) {
            seenMainIds.add(slot.inheritedId!);
            items.push({ entry: mainById.get(slot.inheritedId!)!, origin: 'inherited', inheritedId: slot.inheritedId, hidden: !!slot.hidden });
        }
        // own gone AND inherited gone (or empty slot) → slot dropped
    }

    // Defensive: own entries unreferenced by any slot
    for (const f of sub.files) {
        if (!seenOwnIds.has(f.id)) {
            items.push({ entry: f, origin: 'own', hidden: false });
        }
    }

    // New main entries → insert after nearest preceding main entry present in items
    main.files.forEach((mf, mainIdx) => {
        if (seenMainIds.has(mf.id)) return;
        let insertAt = 0;
        for (let i = mainIdx - 1; i >= 0; i--) {
            const prevId = main.files[i].id;
            const at = items.findIndex(it => it.inheritedId === prevId);
            if (at !== -1) {
                insertAt = at + 1;
                break;
            }
        }
        items.splice(insertAt, 0, { entry: mf, origin: 'inherited', inheritedId: mf.id, hidden: false });
        seenMainIds.add(mf.id);
    });

    return items;
}

/** Write the runtime list back into the persisted shape. Mutates project. */
export function applyItemsToProject(items: ListItem[], project: Project): void {
    if (project.parentId) {
        project.files = items.filter(i => i.origin !== 'inherited').map(i => i.entry);
        project.layout = items.map(i => {
            const slot: LayoutSlot = {};
            if (i.inheritedId) slot.inheritedId = i.inheritedId;
            if (i.origin !== 'inherited') slot.ownId = i.entry.id;
            if (i.hidden) slot.hidden = true;
            return slot;
        });
    } else {
        for (const i of items) {
            if (i.hidden) i.entry.hidden = true;
            else delete i.entry.hidden;
        }
        project.files = items.map(i => i.entry);
        delete project.layout;
    }
}

/** Entries that go into merge/output (eye filter). */
export function visibleEntries(items: ListItem[]): FileEntry[] {
    return items.filter(i => !i.hidden).map(i => i.entry);
}

/** Turn a subproject into a standalone project: copy inherited entries in (fresh ids), keep order + visibility. Mutates sub. */
export function detachProject(sub: Project, items: ListItem[]): void {
    sub.files = items.map(i => {
        let entry: FileEntry;
        if (i.origin === 'inherited') {
            entry = { ...i.entry, id: generateId() };
            delete entry._file;
        } else {
            entry = i.entry;
        }
        if (i.hidden) entry.hidden = true;
        else delete entry.hidden;
        return entry;
    });
    delete sub.parentId;
    delete sub.layout;
}

/** Reset (Clear all in a subproject): back to main defaults — all inherited, all visible, main order. */
export function resetSubItems(main: Project): ListItem[] {
    return main.files.map(f => ({ entry: f, origin: 'inherited' as const, inheritedId: f.id, hidden: false }));
}