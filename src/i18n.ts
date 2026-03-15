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
        outputMeta: '{files} files \u00B7 {lines} lines \u00B7 {size}',
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
        downloadPdfFile: 'Download PDF',
        pdfFileName: 'File name',
    },
    cs: {
        projects: 'Projekty',
        newProject: 'Nov\u00FD projekt',
        dropFilesHere: 'P\u0159et\u00E1hn\u011Bte soubory sem',
        filesWillBeAdded: 'soubory budou p\u0159id\u00E1ny do projektu',
        mergeFiles: '\u26D9 Slou\u010Dit soubory',
        clearAll: 'Vymazat v\u0161e',
        includeFilePaths: 'Vkl\u00E1dat cesty k soubor\u016Fm',
        trimEmptyLines: 'O\u0159\u00EDznout pr\u00E1zdn\u00E9 \u0159\u00E1dky na za\u010D\u00E1tku/konci',
        mergedOutput: 'Slou\u010Den\u00FD v\u00FDstup',
        truncationWarning: 'Zobrazen\u00ED je omezeno na 20 000 \u0159\u00E1dk\u016F. St\u00E1hn\u011Bte soubor pro kompletn\u00ED obsah.',
        copy: '\uD83D\uDCCB Kop\u00EDrovat',
        download: '\u2B07 St\u00E1hnout',
        rename: 'P\u0159ejmenovat',
        delete: 'Smazat',
        remove: 'Odebrat',
        cancel: 'Zru\u0161it',
        create: 'Vytvo\u0159it',
        renameProject: 'P\u0159ejmenovat projekt',
        deleteProject: 'Smazat projekt',
        deleteProjectConfirm: 'Opravdu chcete smazat projekt <strong>{name}</strong>?',
        projectRenamed: 'Projekt p\u0159ejmenov\u00E1n: {name}',
        cannotDeleteLast: 'Nelze smazat posledn\u00ED projekt',
        projectDeleted: 'Projekt smaz\u00E1n',
        newProjectTitle: 'Nov\u00FD projekt',
        projectNamePlaceholder: 'N\u00E1zev projektu',
        projectCreated: 'Projekt vytvo\u0159en: {name}',
        defaultProject: 'V\u00FDchoz\u00ED projekt',
        loading: '\u23F3 Na\u010D\u00EDt\u00E1n\u00ED\u2026',
        outputMeta: '{files} soubor\u016F \u00B7 {lines} \u0159\u00E1dk\u016F \u00B7 {size}',
        errorReadingFiles: 'Chyba p\u0159i \u010Dten\u00ED soubor\u016F: {message}',
        copiedToClipboard: 'Zkop\u00EDrov\u00E1no do schr\u00E1nky',
        copied: 'Zkop\u00EDrov\u00E1no',
        copyFailed: 'Kop\u00EDrov\u00E1n\u00ED selhalo \u2014 zkop\u00EDrujte ru\u010Dn\u011B',
        fileDownloaded: 'Soubor sta\u017Een',
        downloadFile: 'St\u00E1hnout soubor',
        fileName: 'N\u00E1zev souboru',
        fileFormat: 'Form\u00E1t',
        clearAllTitle: 'Vymazat v\u0161e',
        clearAllConfirm: 'Opravdu chcete vymazat v\u0161echny soubory a v\u00FDstup?',
        clear: 'Vymazat',
        allCleared: 'V\u0161e vymaz\u00E1no',
        updated: 'Aktualizov\u00E1n: {name}',
        lines: 'lines',
        downloadPdf: '\u2B07 St\u00E1hnout PDF',
        pdfDownloaded: 'PDF sta\u017Eeno',
        pdfBinaryContent: 'Bin\u00E1rn\u00ED obsah PDF',
        downloadPdfFile: 'St\u00E1hnout PDF',
        pdfFileName: 'N\u00E1zev souboru',
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