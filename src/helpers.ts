import { estimateTokenCount } from 'tokenx';

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

export function countTokens(text: string): number {
    if (!text) return 0;
    return estimateTokenCount(text);
}

export function formatTokens(count: number): string {
    if (count < 1000) return String(count);
    if (count < 1_000_000) return (count / 1000).toFixed(1) + 'k';
    return (count / 1_000_000).toFixed(1) + 'M';
}

export function cleanPath(rawPath: string): string {
    if (!rawPath) return '';
    let p = rawPath.replace(/^file:\/{1,3}/, '');
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

/**
 * Compress content for LLM consumption — removes comments, collapses empty lines,
 * reduces indentation, and trims trailing whitespace.
 * Preserves semantic meaning while reducing token count (~25-35% savings).
 */
export function compressForLLM(content: string, filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const isPython = ['py', 'pyw'].includes(ext);
    const isMarkdown = ['md', 'mdx'].includes(ext);

    // Don't compress markdown/plaintext — comments ARE the content
    if (isMarkdown || ['txt', 'log'].includes(ext)) {
        return collapseEmptyLines(content);
    }

    let result = content;

    // Remove comments (language-aware)
    result = removeComments(result, ext);

    // Reduce indentation (except Python where it's syntactic)
    if (!isPython) {
        result = reduceIndentation(result);
    }

    // Trim trailing whitespace per line
    result = result.replace(/[ \t]+$/gm, '');

    // Collapse consecutive empty lines into a single one
    result = collapseEmptyLines(result);

    return result;
}

function removeComments(content: string, ext: string): string {
    // Languages with // and /* */ comments
    const cStyleComments = ['js', 'jsx', 'ts', 'tsx', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'swift', 'kt', 'scala', 'php', 'scss', 'less', 'css', 'vue', 'svelte'];
    // Languages with # comments
    const hashComments = ['py', 'pyw', 'rb', 'sh', 'bash', 'zsh', 'yaml', 'yml', 'neon', 'toml', 'pl', 'r'];
    // Languages with <!-- --> comments
    const htmlComments = ['html', 'htm', 'xml', 'svg', 'latte', 'blade', 'vue', 'svelte'];

    if (cStyleComments.includes(ext)) {
        // Remove block comments (non-greedy)
        content = content.replace(/\/\*[\s\S]*?\*\//g, '');
        // Remove line comments (but not URLs like https://)
        content = content.replace(/^([ \t]*)\/\/.*$/gm, '');
        // Remove inline // comments — only when preceded by whitespace (avoid URLs)
        content = content.replace(/\s\/\/(?!\/).*$/gm, '');
    }

    if (hashComments.includes(ext)) {
        // Remove # comments (but not shebangs #! and not inside strings)
        content = content.replace(/^([ \t]*)#(?!!).*$/gm, '');
        // Remove inline # comments (after code, preceded by whitespace)
        content = content.replace(/\s+#(?!!)(?![{([\]]).*$/gm, '');
    }

    if (htmlComments.includes(ext)) {
        content = content.replace(/<!--[\s\S]*?-->/g, '');
    }

    // SQL comments
    if (ext === 'sql') {
        content = content.replace(/--.*$/gm, '');
        content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    }

    return content;
}

function reduceIndentation(content: string): string {
    return content.replace(/^(\t+)/gm, (_, tabs: string) => {
        return '  '.repeat(tabs.length);
    }).replace(/^( {4})+/gm, (match) => {
        const depth = match.length / 4;
        return '  '.repeat(depth);
    });
}

function collapseEmptyLines(content: string): string {
    return content.replace(/\n{3,}/g, '\n\n');
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