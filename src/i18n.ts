export type LangKey = 'en' | 'cs';

const translations: Record<LangKey, Record<string, string>> = {
    en: {
        projects: 'Projects',
        newProject: 'New project',
        dropFilesHere: 'Drop files here',
        filesWillBeAdded: 'files will be added to the project',
        mergeFiles: '\u26D9 Merge files',
        clearAll: 'Clear all',
        includeFilePaths: 'Include file paths',
        trimEmptyLines: 'Trim empty lines at start/end',
        mergedOutput: 'Merged output',
        truncationWarning: 'Display is limited to 20,000 lines. Download the file for full content.',
        copy: '\uD83D\uDCCB Copy',
        download: '\u2B07 Download',
        rename: 'Rename',
        delete: 'Delete',
        remove: 'Remove',
        cancel: 'Cancel',
        create: 'Create',
        renameProject: 'Rename project',
        deleteProject: 'Delete project',
        deleteProjectConfirm: 'Are you sure you want to delete project <strong>{name}</strong>?',
        projectRenamed: 'Project renamed: {name}',
        cannotDeleteLast: 'Cannot delete the last project',
        projectDeleted: 'Project deleted',
        newProjectTitle: 'New project',
        projectNamePlaceholder: 'Project name',
        projectCreated: 'Project created: {name}',
        defaultProject: 'Default project',
        loading: '\u23F3 Loading\u2026',
        outputMeta: '{files} files \u00B7 {lines} lines \u00B7 {size} \u00B7 ~{tokens} tokens',
        errorReadingFiles: 'Error reading files: {message}',
        copiedToClipboard: 'Copied to clipboard',
        copied: 'Copied',
        copyFailed: 'Copy failed — please copy manually',
        fileDownloaded: 'File downloaded',
        downloadFile: 'Download file',
        fileName: 'File name',
        fileFormat: 'Format',
        clearAllTitle: 'Clear all',
        clearAllConfirm: 'Are you sure you want to clear all files and output?',
        clear: 'Clear',
        allCleared: 'All cleared',
        updated: 'Updated: {name}',
        lines: 'lines',
        downloadPdf: '\u2B07 Download PDF',
        pdfDownloaded: 'PDF downloaded',
        pdfBinaryContent: 'PDF binary content',
        convertPdfToText: 'Convert PDF documents to text',
        downloadPdfFile: 'Download PDF',
        pdfFileName: 'File name',
    },
    cs: {
        projects: 'Projekty',
        newProject: 'Nový projekt',
        dropFilesHere: 'Přetáhněte soubory sem',
        filesWillBeAdded: 'soubory budou přidány do projektu',
        mergeFiles: '\u26D9 Sloučit soubory',
        clearAll: 'Vymazat vše',
        includeFilePaths: 'Vkládat cesty k souborům',
        trimEmptyLines: 'Oříznout prázdné řádky na začátku/konci',
        mergedOutput: 'Sloučený výstup',
        truncationWarning: 'Zobrazení je omezeno na 20 000 řádků. Stáhněte soubor pro kompletní obsah.',
        copy: '\uD83D\uDCCB Kopírovat',
        download: '\u2B07 Stáhnout',
        rename: 'Přejmenovat',
        delete: 'Smazat',
        remove: 'Odebrat',
        cancel: 'Zrušit',
        create: 'Vytvořit',
        renameProject: 'Přejmenovat projekt',
        deleteProject: 'Smazat projekt',
        deleteProjectConfirm: 'Opravdu chcete smazat projekt <strong>{name}</strong>?',
        projectRenamed: 'Projekt přejmenován: {name}',
        cannotDeleteLast: 'Nelze smazat poslední projekt',
        projectDeleted: 'Projekt smazán',
        newProjectTitle: 'Nový projekt',
        projectNamePlaceholder: 'Název projektu',
        projectCreated: 'Projekt vytvořen: {name}',
        defaultProject: 'Výchozí projekt',
        loading: '\u23F3 Načítání\u2026',
        outputMeta: '{files} souborů \u00B7 {lines} řádků \u00B7 {size} \u00B7 ~{tokens} tokenů',
        errorReadingFiles: 'Chyba při čtení souborů: {message}',
        copiedToClipboard: 'Zkopírováno do schránky',
        copied: 'Zkopírováno',
        copyFailed: 'Kopírování selhalo \u2014 zkopírujte ručně',
        fileDownloaded: 'Soubor stažen',
        downloadFile: 'Stáhnout soubor',
        fileName: 'Název souboru',
        fileFormat: 'Formát',
        clearAllTitle: 'Vymazat vše',
        clearAllConfirm: 'Opravdu chcete vymazat všechny soubory a výstup?',
        clear: 'Vymazat',
        allCleared: 'Vše vymazáno',
        updated: 'Aktualizován: {name}',
        lines: 'lines',
        downloadPdf: '\u2B07 Stáhnout PDF',
        pdfDownloaded: 'PDF staženo',
        pdfBinaryContent: 'Binární obsah PDF',
        convertPdfToText: 'Převést PDF dokumenty na text',
        downloadPdfFile: 'Stáhnout PDF',
        pdfFileName: 'Název souboru',
    },
};

let currentLang: LangKey = (localStorage.getItem('fmerge_lang') as LangKey) || 'en';

export function getCurrentLang(): LangKey {
    return currentLang;
}

export function setCurrentLang(lang: LangKey): void {
    currentLang = lang;
    localStorage.setItem('fmerge_lang', lang);
}

export function getAvailableLangs(): LangKey[] {
    return Object.keys(translations) as LangKey[];
}

export function t(key: string, params?: Record<string, string | number>): string {
    let str = (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), String(v));
        }
    }
    return str;
}

export function applyTranslations(): void {
    document.documentElement.lang = currentLang;
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n!);
    });
    document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle!);
    });
}