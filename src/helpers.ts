export function escapeHtml(str: string): string {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

export function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function cleanPath(rawPath: string): string {
    if (!rawPath) return '';
    let p = rawPath.replace(/^file:\/\/\/?/, '');
    try { p = decodeURIComponent(p); } catch (_e) { /* ignore */ }
    return p.trim();
}

export function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

export function getExtColor(ext: string): string {
    ext = ext.toLowerCase();
    const map: Record<string, string> = {
        html: '#e44d26', htm: '#e44d26',
        xml: '#f16529', svg: '#f7a41d',
        js: '#f7df1e', mjs: '#f7df1e',
        ts: '#3178c6', tsx: '#3178c6',
        jsx: '#61dafb',
        vue: '#42b883', svelte: '#ff3e00',
        php: '#777bb4',
        json: '#a8b9cc',
        yaml: '#cb171e', yml: '#cb171e', neon: '#e25822',
        latte: '#6cc644',
        blade: '#f05340',
        css: '#264de4', scss: '#cd6799', less: '#1d365d',
        py: '#3776ab',
        rb: '#cc342d',
        java: '#f89820',
        go: '#00add8',
        rs: '#dea584',
        c: '#555555', cpp: '#f34b7d', h: '#555555',
        sh: '#89e051', bash: '#89e051',
        sql: '#e38c00',
        md: '#083fa1', txt: '#7d7f8c', pdf: '#e74c3c',
    };
    return map[ext] || '#6ee7a0';
}

export function getLanguage(filename: string): string {
    const ext = filename.split('.').pop()!.toLowerCase();
    if (['js', 'jsx'].includes(ext)) return 'javascript';
    if (['ts', 'tsx'].includes(ext)) return 'typescript';
    if (['html', 'xml', 'latte', 'vue', 'svelte'].includes(ext)) return 'xml';
    if (['blade'].includes(ext)) return 'blade';
    if (['php'].includes(ext)) return 'php';
    if (['json'].includes(ext)) return 'json';
    if (['yaml', 'yml', 'neon'].includes(ext)) return 'yaml';
    if (['css'].includes(ext)) return 'css';
    if (['scss'].includes(ext)) return 'scss';
    if (['less'].includes(ext)) return 'less';
    return 'plaintext';
}