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
        py: '#3776ab', pyw: '#3776ab',
        rb: '#cc342d', rake: '#cc342d', gemspec: '#cc342d',
        java: '#f89820',
        go: '#00add8',
        rs: '#dea584',
        c: '#555555', cpp: '#f34b7d', cc: '#f34b7d', cxx: '#f34b7d', h: '#555555', hpp: '#f34b7d', hxx: '#f34b7d', hh: '#f34b7d',
        cs: '#68217a',
        swift: '#f05138',
        kt: '#7f52ff', kts: '#7f52ff',
        scala: '#dc322f', sc: '#dc322f',
        pl: '#0298c3', pm: '#0298c3',
        r: '#276dc3',
        sh: '#89e051', bash: '#89e051', zsh: '#89e051',
        sql: '#e38c00',
        lua: '#000080',
        dart: '#00b4ab',
        hs: '#5e5086', lhs: '#5e5086',
        m: '#438eff', mm: '#438eff',
        groovy: '#4298b8', gradle: '#02303a',
        ps1: '#012456', psm1: '#012456', psd1: '#012456',
        ini: '#d1dbe0', cfg: '#d1dbe0', conf: '#d1dbe0', toml: '#9c4221', env: '#ecd53f',
        md: '#083fa1', mdx: '#083fa1', txt: '#7d7f8c', pdf: '#e74c3c',
        cjs: '#f7df1e',
        dockerfile: '#384d54',
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

export interface SecurityFinding {
    file: string;
    line: number;
    type: string;
    detail: string;
    matched: string;
}

interface SecurityPattern {
    name: string;
    regex: RegExp;
    detail: string;
}

const SECURITY_PATTERNS: SecurityPattern[] = [
    // AWS
    { name: 'AWS Access Key', regex: /\b(AKIA[0-9A-Z]{16})\b/, detail: 'AWS Access Key ID' },
    { name: 'AWS Secret Key', regex: /(?:aws_secret_access_key|secret_access_key|aws_secret)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/i, detail: 'AWS Secret Access Key' },

    // Google
    { name: 'Google API Key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/, detail: 'Google API Key' },
    { name: 'Google OAuth', regex: /\b[0-9]+-[a-z0-9_]{32}\.apps\.googleusercontent\.com\b/, detail: 'Google OAuth Client ID' },

    // GitHub
    { name: 'GitHub Token', regex: /\b(ghp_[A-Za-z0-9_]{36}|gho_[A-Za-z0-9_]{36}|ghu_[A-Za-z0-9_]{36}|ghs_[A-Za-z0-9_]{36}|ghr_[A-Za-z0-9_]{36}|github_pat_[A-Za-z0-9_]{22,82})\b/, detail: 'GitHub Personal Access Token' },

    // Stripe
    { name: 'Stripe Key', regex: /\b(sk_live_[0-9a-zA-Z]{24,}|rk_live_[0-9a-zA-Z]{24,})\b/, detail: 'Stripe Secret/Restricted Key' },
    { name: 'Stripe Publishable', regex: /\b(pk_live_[0-9a-zA-Z]{24,})\b/, detail: 'Stripe Live Publishable Key' },

    // Slack
    { name: 'Slack Token', regex: /\b(xox[bpsa]-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24,})\b/, detail: 'Slack Token' },
    { name: 'Slack Webhook', regex: /hooks\.slack\.com\/services\/T[A-Z0-9]{8,}\/B[A-Z0-9]{8,}\/[a-zA-Z0-9]{24,}/, detail: 'Slack Webhook URL' },

    // Private keys
    { name: 'Private Key', regex: /-----BEGIN\s+(RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/, detail: 'Private Key (RSA/EC/DSA/SSH/PGP)' },

    // JWT
    { name: 'JWT Token', regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, detail: 'JSON Web Token' },

    // Generic API keys / secrets in assignments
    { name: 'API Key Assignment', regex: /(?:api_key|apikey|api_secret|api_token)\s*[:=]\s*['"]([^'"]{8,})['"](?!\s*[:=]\s*$)/i, detail: 'API Key/Secret assignment' },
    { name: 'Secret Assignment', regex: /(?:secret_key|secret_token|auth_token|access_token|bearer_token)\s*[:=]\s*['"]([^'"]{8,})['"](?!\s*[:=]\s*$)/i, detail: 'Secret/Auth Token assignment' },

    // Password assignments
    { name: 'Password', regex: /(?:password|passwd|pwd|pass)\s*[:=]\s*['"]([^'"]{4,})['"](?!\s*(?:prompt|input|field|label|placeholder|name|type|hint))/i, detail: 'Hardcoded password' },

    // Connection strings with credentials
    { name: 'Connection String', regex: /(?:mysql|postgres|postgresql|mongodb|redis|amqp|smtp|ftp):\/\/[^:]+:[^@]+@[^/\s]+/i, detail: 'Connection string with embedded credentials' },

    // Database DSN
    { name: 'Database DSN', regex: /(?:DB_PASSWORD|DATABASE_PASSWORD|MYSQL_PASSWORD|POSTGRES_PASSWORD|MONGO_PASSWORD)\s*[:=]\s*['"]?([^'"\s]{4,})['"]?/i, detail: 'Database password in config' },

    // Twilio
    { name: 'Twilio Key', regex: /\bSK[0-9a-fA-F]{32}\b/, detail: 'Twilio API Key' },

    // SendGrid
    { name: 'SendGrid Key', regex: /\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b/, detail: 'SendGrid API Key' },

    // Mailgun
    { name: 'Mailgun Key', regex: /\bkey-[0-9a-zA-Z]{32}\b/, detail: 'Mailgun API Key' },

    // Heroku
    { name: 'Heroku Key', regex: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b(?=.*heroku)/i, detail: 'Heroku API Key' },

    // NPM token
    { name: 'NPM Token', regex: /\bnpm_[A-Za-z0-9]{36}\b/, detail: 'NPM Access Token' },

    // PyPI token
    { name: 'PyPI Token', regex: /\bpypi-[A-Za-z0-9_-]{50,}\b/, detail: 'PyPI API Token' },

    // Generic high-entropy strings in env-like assignments
    { name: 'Env Secret', regex: /(?:SECRET|TOKEN|PRIVATE|CREDENTIAL|AUTH)[\w]*\s*[:=]\s*['"]([A-Za-z0-9+/=_-]{20,})['"](?!\s*[:=]\s*$)/i, detail: 'Suspicious secret in environment variable' },

    // Bearer tokens in code
    { name: 'Bearer Token', regex: /['"]Bearer\s+[A-Za-z0-9_\-.]{20,}['"]/i, detail: 'Hardcoded Bearer token' },

    // Basic auth header
    { name: 'Basic Auth', regex: /['"]Basic\s+[A-Za-z0-9+/=]{10,}['"]/i, detail: 'Hardcoded Basic Auth header' },
];

/** Scan file content for potential security issues (secrets, keys, credentials). */
export function scanForSecurityIssues(files: { path: string; content: string | null; isCustomText?: boolean; pdfData?: string }[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    for (const file of files) {
        if (!file.content || file.pdfData) continue;

        const lines = file.content.split('\n');
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            // Skip very long lines (likely minified/binary) and comment-only context
            if (line.length > 2000) continue;

            for (const pattern of SECURITY_PATTERNS) {
                const match = line.match(pattern.regex);
                if (match) {
                    // Mask the matched secret for display
                    const raw = match[1] || match[0];
                    const masked = raw.length > 8
                        ? raw.substring(0, 4) + '*'.repeat(Math.min(raw.length - 8, 20)) + raw.substring(raw.length - 4)
                        : '****';

                    findings.push({
                        file: file.path,
                        line: lineIdx + 1,
                        type: pattern.name,
                        detail: pattern.detail,
                        matched: masked,
                    });
                    break; // one finding per line is enough
                }
            }
        }
    }

    return findings;
}

/** Generate a random alphanumeric string of given length. */
function randomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Build a replacement map: file path → Map<lineNumber, replacedLineContent>.
 * Only findings whose index is in `indicesToReplace` are processed.
 * Does NOT mutate the source files — returns data to be applied on output.
 */
export function buildSecretReplacements(
    files: { path: string; content: string | null; pdfData?: string }[],
    findings: SecurityFinding[],
    indicesToReplace: Set<number>,
): Map<string, Map<number, string>> {
    const result = new Map<string, Map<number, string>>();

    // Collect content lines per file (lazy, only files that have findings to replace)
    const contentCache = new Map<string, string[]>();
    for (const file of files) {
        if (file.content && !file.pdfData) {
            contentCache.set(file.path, file.content.split('\n'));
        }
    }

    for (let i = 0; i < findings.length; i++) {
        if (!indicesToReplace.has(i)) continue;
        const finding = findings[i];
        const lines = contentCache.get(finding.file);
        if (!lines) continue;

        const lineIdx = finding.line - 1;
        if (lineIdx < 0 || lineIdx >= lines.length) continue;

        // Start from already-replaced line if we already touched it
        let fileMap = result.get(finding.file);
        if (!fileMap) {
            fileMap = new Map();
            result.set(finding.file, fileMap);
        }
        const currentLine = fileMap.get(finding.line) ?? lines[lineIdx];

        for (const pattern of SECURITY_PATTERNS) {
            const match = currentLine.match(pattern.regex);
            if (match && pattern.name === finding.type) {
                const secret = match[1] || match[0];
                const replacement = randomString(secret.length);
                fileMap.set(finding.line, currentLine.replace(secret, replacement));
                break;
            }
        }
    }

    return result;
}

/**
 * Apply secret replacements to a file's content string.
 * Returns a new string with replaced lines — original is not mutated.
 */
export function applyReplacements(content: string, lineReplacements: Map<number, string>): string {
    const lines = content.split('\n');
    for (const [lineNum, replaced] of lineReplacements) {
        const idx = lineNum - 1;
        if (idx >= 0 && idx < lines.length) {
            lines[idx] = replaced;
        }
    }
    return lines.join('\n');
}

export function getLanguage(filename: string): string {
    const ext = filename.split('.').pop()!.toLowerCase();
    if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) return 'javascript';
    if (['ts', 'tsx'].includes(ext)) return 'typescript';
    if (['html', 'htm', 'xml', 'svg', 'latte', 'vue', 'svelte'].includes(ext)) return 'xml';
    if (['blade'].includes(ext)) return 'blade';
    if (['php'].includes(ext)) return 'php';
    if (['json'].includes(ext)) return 'json';
    if (['yaml', 'yml', 'neon'].includes(ext)) return 'yaml';
    if (['css'].includes(ext)) return 'css';
    if (['scss'].includes(ext)) return 'scss';
    if (['less'].includes(ext)) return 'less';
    if (['py', 'pyw'].includes(ext)) return 'python';
    if (['rb', 'rake', 'gemspec'].includes(ext)) return 'ruby';
    if (['java'].includes(ext)) return 'java';
    if (['c', 'h'].includes(ext)) return 'c';
    if (['cpp', 'cc', 'cxx', 'hpp', 'hxx', 'hh'].includes(ext)) return 'cpp';
    if (['cs'].includes(ext)) return 'csharp';
    if (['go'].includes(ext)) return 'go';
    if (['rs'].includes(ext)) return 'rust';
    if (['swift'].includes(ext)) return 'swift';
    if (['kt', 'kts'].includes(ext)) return 'kotlin';
    if (['scala', 'sc'].includes(ext)) return 'scala';
    if (['pl', 'pm'].includes(ext)) return 'perl';
    if (['r'].includes(ext)) return 'r';
    if (['sh', 'bash', 'zsh'].includes(ext)) return 'bash';
    if (['sql'].includes(ext)) return 'sql';
    if (['lua'].includes(ext)) return 'lua';
    if (['dart'].includes(ext)) return 'dart';
    if (['hs', 'lhs'].includes(ext)) return 'haskell';
    if (['m', 'mm'].includes(ext)) return 'objectivec';
    if (['groovy', 'gradle'].includes(ext)) return 'groovy';
    if (['ps1', 'psm1', 'psd1'].includes(ext)) return 'powershell';
    if (['ini', 'cfg', 'conf', 'toml', 'env'].includes(ext)) return 'ini';
    if (['md', 'mdx'].includes(ext)) return 'markdown';
    if (filename.toLowerCase() === 'dockerfile' || ext === 'dockerfile') return 'dockerfile';
    return 'plaintext';
}