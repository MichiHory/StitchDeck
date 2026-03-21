import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import php from 'highlight.js/lib/languages/php';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import scss from 'highlight.js/lib/languages/scss';
import less from 'highlight.js/lib/languages/less';
import json from 'highlight.js/lib/languages/json';
import javascript from 'highlight.js/lib/languages/javascript';
import blade from 'highlight.js/lib/languages/php-template';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';
import scala from 'highlight.js/lib/languages/scala';
import perl from 'highlight.js/lib/languages/perl';
import r from 'highlight.js/lib/languages/r';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import lua from 'highlight.js/lib/languages/lua';
import dart from 'highlight.js/lib/languages/dart';
import haskell from 'highlight.js/lib/languages/haskell';
import objectivec from 'highlight.js/lib/languages/objectivec';
import groovy from 'highlight.js/lib/languages/groovy';
import powershell from 'highlight.js/lib/languages/powershell';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import ini from 'highlight.js/lib/languages/ini';
import markdown from 'highlight.js/lib/languages/markdown';

import {MAX_DISPLAY_LINES, state} from './state';
import {cleanPath, compressForLLM, countTokens, escapeHtml, formatSize, formatTokens, getLanguage, readFile, scanForSecurityIssues} from './helpers';
import {t} from './i18n';
import {toast} from './toast';
import {showModal} from './modal';
import {renderFileList} from './file-list';
import {scheduleSave} from './projects';
import {base64ToUint8Array} from './pdf';
import {
    clearBtn,
    copyBtn,
    downloadBtn,
    downloadPdfBtn,
    lineNumbers,
    mergeBtn,
    outputContent,
    outputMeta,
    outputSection,
    toggleCompress,
    toggleFileMap,
    togglePaths,
    togglePdfToText,
    toggleSecurityScan,
    toggleTrimEmpty,
    truncationWarning,
} from './dom';

// Register highlight.js languages
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('php', php);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('less', less);
hljs.registerLanguage('json', json);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('blade', blade);
hljs.registerLanguage('python', python);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('java', java);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('scala', scala);
hljs.registerLanguage('perl', perl);
hljs.registerLanguage('r', r);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('lua', lua);
hljs.registerLanguage('dart', dart);
hljs.registerLanguage('haskell', haskell);
hljs.registerLanguage('objectivec', objectivec);
hljs.registerLanguage('groovy', groovy);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('markdown', markdown);

export function initMerge(): void {
    // Toggle persistence
    togglePaths.checked = localStorage.getItem('sheafle_togglePaths') !== 'false';
    toggleTrimEmpty.checked = localStorage.getItem('sheafle_toggleTrimEmpty') === 'true';
    togglePdfToText.checked = localStorage.getItem('sheafle_togglePdfToText') !== 'false';
    toggleFileMap.checked = localStorage.getItem('sheafle_toggleFileMap') !== 'false';
    toggleCompress.checked = localStorage.getItem('sheafle_toggleCompress') === 'true';
    toggleSecurityScan.checked = localStorage.getItem('sheafle_toggleSecurityScan') !== 'false';
    // Mutual exclusivity: if both are on, LLM format wins (it's the more advanced option)
    if (togglePaths.checked && toggleFileMap.checked) {
        togglePaths.checked = false;
        localStorage.setItem('sheafle_togglePaths', 'false');
    }
    togglePaths.addEventListener('change', () => {
        localStorage.setItem('sheafle_togglePaths', String(togglePaths.checked));
        if (togglePaths.checked && toggleFileMap.checked) {
            toggleFileMap.checked = false;
            localStorage.setItem('sheafle_toggleFileMap', 'false');
        }
    });
    toggleTrimEmpty.addEventListener('change', () => localStorage.setItem('sheafle_toggleTrimEmpty', String(toggleTrimEmpty.checked)));
    togglePdfToText.addEventListener('change', () => localStorage.setItem('sheafle_togglePdfToText', String(togglePdfToText.checked)));
    toggleCompress.addEventListener('change', () => localStorage.setItem('sheafle_toggleCompress', String(toggleCompress.checked)));
    toggleSecurityScan.addEventListener('change', () => localStorage.setItem('sheafle_toggleSecurityScan', String(toggleSecurityScan.checked)));
    toggleFileMap.addEventListener('change', () => {
        localStorage.setItem('sheafle_toggleFileMap', String(toggleFileMap.checked));
        if (toggleFileMap.checked && togglePaths.checked) {
            togglePaths.checked = false;
            localStorage.setItem('sheafle_togglePaths', 'false');
        }
    });

    // Merge
    mergeBtn.addEventListener('click', async () => {
        if (!state.files.length) return;

        // Security scan
        if (toggleSecurityScan.checked) {
            // Ensure lazy-loaded files have content
            for (const f of state.files) {
                if (f.content === null && f._file) {
                    f.content = await readFile(f._file);
                }
            }
            const findings = scanForSecurityIssues(state.files);
            if (findings.length > 0) {
                const tableRows = findings.map(f =>
                    `<tr>
                        <td title="${escapeHtml(f.file)}">${escapeHtml(f.file.split('/').pop() || f.file)}</td>
                        <td>${f.line}</td>
                        <td>${escapeHtml(f.type)}</td>
                        <td>${escapeHtml(f.detail)}</td>
                        <td class="security-match">${escapeHtml(f.matched)}</td>
                    </tr>`
                ).join('');

                const bodyHtml = `
                    <div class="security-warning-body">
                        <p class="security-warning-intro">${t('securityWarningIntro')}</p>
                        <p class="security-warning-count">${t('securityWarningCount', { count: findings.length })}</p>
                        <div class="security-table-wrap">
                            <table class="security-table">
                                <thead>
                                    <tr>
                                        <th>${t('securityWarningFile')}</th>
                                        <th>${t('securityWarningLine')}</th>
                                        <th>${t('securityWarningType')}</th>
                                        <th>${t('securityWarningDetail')}</th>
                                        <th>${t('securityWarningMatch')}</th>
                                    </tr>
                                </thead>
                                <tbody>${tableRows}</tbody>
                            </table>
                        </div>
                    </div>
                `;

                const proceed = await showModal({
                    title: t('securityWarningTitle'),
                    body: bodyHtml,
                    confirmText: t('securityIgnoreAndMerge'),
                    confirmClass: 'btn-danger',
                    modalClass: 'modal--large',
                });
                if (!proceed) return;
            }
        }

        mergeBtn.disabled = true;
        mergeBtn.querySelector('[data-i18n]')!.textContent = t('loading');

        try {
            const plainLinesArray: string[] = [];
            const htmlLinesArray: string[] = [];

            const includePaths = togglePaths.checked;
            const trimEmpty = toggleTrimEmpty.checked;
            const pdfToText = togglePdfToText.checked;
            const includeFileMap = toggleFileMap.checked;
            const compress = toggleCompress.checked;

            const xmlTagStyle = 'color: #38bdf8; font-weight: 700;';

            // Generate file map
            if (includeFileMap) {
                plainLinesArray.push('<file_map>');
                htmlLinesArray.push(`<span style="${xmlTagStyle}">&lt;file_map&gt;</span>`);
                for (let i = 0; i < state.files.length; i++) {
                    const entry = state.files[i];
                    const label = entry.isCustomText
                        ? (entry.includeTitle && entry.customTitle ? `[text: ${entry.customTitle}]` : '[text]')
                        : cleanPath(entry.path);
                    const line = `${i + 1}. ${label}`;
                    plainLinesArray.push(line);
                    htmlLinesArray.push(`<span style="color: #38bdf8;">${escapeHtml(line)}</span>`);
                }
                plainLinesArray.push('</file_map>');
                htmlLinesArray.push(`<span style="${xmlTagStyle}">&lt;/file_map&gt;</span>`);
                plainLinesArray.push('');
                htmlLinesArray.push('');
            }

            for (let i = 0; i < state.files.length; i++) {
                const entry = state.files[i];

                // Custom text entries — treat like .md files
                if (entry.isCustomText) {
                    let contentStr = entry.content || '';
                    if (compress) {
                        contentStr = compressForLLM(contentStr, entry.customTitle ? `${entry.customTitle}.md` : 'text.md');
                    }
                    if (trimEmpty) {
                        contentStr = contentStr.replace(/^\n+/, '').replace(/\n+$/, '');
                    }

                    if (includeFileMap) {
                        const titleAttr = entry.includeTitle && entry.customTitle ? ` title="${entry.customTitle}"` : '';
                        const titleAttrHtml = entry.includeTitle && entry.customTitle ? ` title="${escapeHtml(entry.customTitle)}"` : '';
                        plainLinesArray.push(`<file type="text"${titleAttr}>`);
                        htmlLinesArray.push(`<span style="${xmlTagStyle}">&lt;file type="text"${titleAttrHtml}&gt;</span>`);
                    } else if (entry.includeTitle && entry.customTitle) {
                        plainLinesArray.push(`${entry.customTitle}:`);
                        htmlLinesArray.push(`<span style="color: #a78bfa; font-weight: 700;">${escapeHtml(entry.customTitle)}:</span>`);
                    }

                    const plainContentLines = contentStr.split('\n');
                    plainLinesArray.push(...plainContentLines);
                    htmlLinesArray.push(...plainContentLines.map(l => escapeHtml(l)));

                    if (includeFileMap) {
                        plainLinesArray.push('</file>');
                        htmlLinesArray.push(`<span style="${xmlTagStyle}">&lt;/file&gt;</span>`);
                    }
                    if (i < state.files.length - 1) {
                        plainLinesArray.push('');
                        htmlLinesArray.push('');
                    }
                    continue;
                }

                if (entry.pdfData) {
                    let contentStr: string;
                    if (pdfToText) {
                        contentStr = await extractPdfText(entry.pdfData);
                        if (compress) {
                            contentStr = compressForLLM(contentStr, entry.path);
                        }
                        if (trimEmpty) {
                            contentStr = contentStr.replace(/^\n+/, '').replace(/\n+$/, '');
                        }
                    } else {
                        contentStr = `[PDF \u2013 ${t('pdfBinaryContent')}]`;
                    }

                    if (includeFileMap) {
                        const p = cleanPath(entry.path);
                        plainLinesArray.push(`<file path="${p}">`);
                        htmlLinesArray.push(`<span style="${xmlTagStyle}">&lt;file path="${escapeHtml(p)}"&gt;</span>`);
                    } else if (includePaths) {
                        plainLinesArray.push(`${entry.path}:`);
                        htmlLinesArray.push(`<span style="color: #27db0f; font-weight: 700;">${escapeHtml(entry.path)}:</span>`);
                    }

                    if (pdfToText) {
                        const lines = contentStr.split('\n');
                        plainLinesArray.push(...lines);
                        htmlLinesArray.push(...lines.map(l => escapeHtml(l)));
                    } else {
                        plainLinesArray.push(contentStr);
                        htmlLinesArray.push(`<span style="color: var(--text-dim); font-style: italic;">${escapeHtml(contentStr)}</span>`);
                    }

                    if (includeFileMap) {
                        plainLinesArray.push('</file>');
                        htmlLinesArray.push(`<span style="${xmlTagStyle}">&lt;/file&gt;</span>`);
                    }
                    if (i < state.files.length - 1) {
                        plainLinesArray.push('');
                        htmlLinesArray.push('');
                    }
                    continue;
                }

                let contentStr = entry.content || '';
                const lang = getLanguage(entry.path);

                if (compress) {
                    contentStr = compressForLLM(contentStr, entry.path);
                }
                if (trimEmpty) {
                    contentStr = contentStr.replace(/^\n+/, '').replace(/\n+$/, '');
                }

                if (includeFileMap) {
                    const p = cleanPath(entry.path);
                    plainLinesArray.push(`<file path="${p}">`);
                    htmlLinesArray.push(`<span style="${xmlTagStyle}">&lt;file path="${escapeHtml(p)}"&gt;</span>`);
                } else if (includePaths) {
                    plainLinesArray.push(`${entry.path}:`);
                    htmlLinesArray.push(`<span style="color: #27db0f; font-weight: 700;">${escapeHtml(entry.path)}:</span>`);
                }

                const plainContentLines = contentStr.split('\n');
                plainLinesArray.push(...plainContentLines);

                let highlightedContent = '';
                if (lang !== 'plaintext' && hljs.getLanguage(lang)) {
                    highlightedContent = hljs.highlight(contentStr, { language: lang, ignoreIllegals: true }).value;
                } else {
                    highlightedContent = escapeHtml(contentStr);
                }

                const highlightedContentLines = highlightedContent.split('\n');
                htmlLinesArray.push(...highlightedContentLines);

                if (includeFileMap) {
                    plainLinesArray.push('</file>');
                    htmlLinesArray.push(`<span style="${xmlTagStyle}">&lt;/file&gt;</span>`);
                }

                if (i < state.files.length - 1) {
                    plainLinesArray.push('');
                    htmlLinesArray.push('');
                }
            }

            state.fullMergedContent = plainLinesArray.join('\n');
            const totalLines = plainLinesArray.length;
            const totalFiles = state.files.length;
            const totalSize = formatSize(new Blob([state.fullMergedContent]).size);
            const totalTokens = formatTokens(countTokens(state.fullMergedContent));

            let displayLinesHtml: string[];

            if (totalLines > MAX_DISPLAY_LINES) {
                displayLinesHtml = htmlLinesArray.slice(0, MAX_DISPLAY_LINES);
                truncationWarning.classList.add('visible');
            } else {
                displayLinesHtml = htmlLinesArray;
                truncationWarning.classList.remove('visible');
            }

            outputContent.innerHTML = displayLinesHtml.join('\n');
            lineNumbers.textContent = displayLinesHtml.map((_, i) => String(i + 1)).join('\n');

            outputMeta.textContent = t('outputMeta', { files: totalFiles, lines: totalLines.toLocaleString(), size: totalSize, tokens: totalTokens });
            outputSection.style.display = 'block';
            outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (err) {
            toast(t('errorReadingFiles', { message: (err as Error).message }));
        }

        mergeBtn.disabled = false;
        mergeBtn.querySelector('[data-i18n]')!.textContent = t('mergeFiles');
    });

    // Copy
    copyBtn.addEventListener('click', async () => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(state.fullMergedContent);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = state.fullMergedContent;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            toast(t('copiedToClipboard'), 'success');
        } catch {
            toast(t('copyFailed'));
        }
    });

    // Download text
    downloadBtn.addEventListener('click', async () => {
        const formats = ['txt', 'md', 'json', 'xml', 'csv', 'html', 'log'];
        const optionsHtml = formats.map(f => `<option value="${f}"${f === 'txt' ? ' selected' : ''}>.${f}</option>`).join('');
        const result = await showModal({
            title: t('downloadFile'),
            body: `
                <div class="modal-form-group">
                    <label>${escapeHtml(t('fileName'))}</label>
                    <div class="modal-form-row">
                        <input class="modal-input" type="text" value="merged-files" data-role="filename">
                        <select class="modal-select" data-role="format">${optionsHtml}</select>
                    </div>
                </div>
            `,
            confirmText: t('download'),
            confirmClass: 'btn-primary',
            resolveData: (overlay) => {
                const name = (overlay.querySelector('[data-role="filename"]') as HTMLInputElement).value.trim();
                const ext = (overlay.querySelector('[data-role="format"]') as HTMLSelectElement).value;
                return name ? { name, ext } : null;
            }
        }) as { name: string; ext: string } | null;
        if (!result) return;
        const filename = `${result.name}.${result.ext}`;
        const mimeTypes: Record<string, string> = { txt: 'text/plain', md: 'text/markdown', json: 'application/json', xml: 'application/xml', csv: 'text/csv', html: 'text/html', log: 'text/plain' };
        const blob = new Blob([state.fullMergedContent], { type: (mimeTypes[result.ext] || 'text/plain') + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast(t('fileDownloaded'), 'success');
    });

    // Download PDF
    downloadPdfBtn.addEventListener('click', async () => {
        const result = await showModal({
            title: t('downloadPdfFile'),
            body: `
                <div class="modal-form-group">
                    <label>${escapeHtml(t('pdfFileName'))}</label>
                    <input class="modal-input" type="text" value="merged-files" data-role="pdffilename">
                </div>
            `,
            confirmText: t('downloadPdf'),
            confirmClass: 'btn-primary',
            resolveData: (overlay) => {
                const name = (overlay.querySelector('[data-role="pdffilename"]') as HTMLInputElement).value.trim();
                return name || null;
            }
        }) as string | null;
        if (!result) return;

        downloadPdfBtn.disabled = true;
        downloadPdfBtn.querySelector('[data-i18n]')!.textContent = t('loading');

        try {
            const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
            const mergedPdf = await PDFDocument.create();
            const includePaths = togglePaths.checked;
            const trimEmpty = toggleTrimEmpty.checked;

            for (const entry of state.files) {
                if (entry.pdfData) {
                    const pdfBytes = base64ToUint8Array(entry.pdfData);
                    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
                    const pages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
                    pages.forEach(page => mergedPdf.addPage(page));
                } else {
                    const font = await mergedPdf.embedFont(StandardFonts.Courier);
                    const fontSize = 10;
                    const margin = 50;
                    const lineHeight = fontSize * 1.4;
                    const pageWidth = 595;
                    const pageHeight = 842;
                    const usableHeight = pageHeight - 2 * margin;
                    const usableWidth = pageWidth - 2 * margin;
                    const linesPerPage = Math.floor(usableHeight / lineHeight);
                    const maxCharsPerLine = Math.floor(usableWidth / (fontSize * 0.6));

                    let contentStr = entry.content || '';
                    if (trimEmpty) {
                        contentStr = contentStr.replace(/^\n+/, '').replace(/\n+$/, '');
                    }

                    const allLines: string[] = [];
                    if (entry.isCustomText) {
                        if (entry.includeTitle && entry.customTitle) {
                            allLines.push(entry.customTitle + ':');
                        }
                    } else if (includePaths) {
                        allLines.push(entry.path + ':');
                    }

                    const rawLines = contentStr.split('\n');
                    for (const line of rawLines) {
                        if (line.length <= maxCharsPerLine) {
                            allLines.push(line);
                        } else {
                            for (let j = 0; j < line.length; j += maxCharsPerLine) {
                                allLines.push(line.substring(j, j + maxCharsPerLine));
                            }
                        }
                    }

                    for (let p = 0; p < allLines.length; p += linesPerPage) {
                        const pageLines = allLines.slice(p, p + linesPerPage);
                        const page = mergedPdf.addPage([pageWidth, pageHeight]);
                        let y = pageHeight - margin;
                        for (const ln of pageLines) {
                            let safeLine = '';
                            for (const ch of ln) {
                                try {
                                    font.encodeText(ch);
                                    safeLine += ch;
                                } catch {
                                    safeLine += '?';
                                }
                            }
                            page.drawText(safeLine, {
                                x: margin,
                                y: y,
                                size: fontSize,
                                font: font,
                                color: rgb(0, 0, 0),
                            });
                            y -= lineHeight;
                        }
                    }
                }
            }

            const pdfBytes = await mergedPdf.save();
            const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result + '.pdf';
            a.click();
            URL.revokeObjectURL(url);
            toast(t('pdfDownloaded'), 'success');
        } catch (err) {
            toast(t('errorReadingFiles', { message: (err as Error).message }));
        }

        downloadPdfBtn.disabled = false;
        downloadPdfBtn.querySelector('[data-i18n]')!.textContent = t('downloadPdf');
    });

    // Clear
    clearBtn.addEventListener('click', async () => {
        const confirmed = await showModal({
            title: t('clearAllTitle'),
            body: t('clearAllConfirm'),
            confirmText: t('clear'),
            confirmClass: 'btn-danger',
        });
        if (!confirmed) return;
        state.files = [];
        state.fullMergedContent = '';
        outputContent.innerHTML = '';
        lineNumbers.textContent = '';
        outputSection.style.display = 'none';
        truncationWarning.classList.remove('visible');
        renderFileList();
        scheduleSave();
        toast(t('allCleared'), 'success');
    });
}

let pdfWorkerBlobUrl: string | null = null;

interface PdfTextItem {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontName: string;
}

function extractItemsFromContent(content: { items: Record<string, unknown>[] }): PdfTextItem[] {
    const items: PdfTextItem[] = [];
    for (const item of content.items) {
        if (!('str' in item)) continue;
        const ti = item as unknown as { str: string; transform: number[]; width: number; height: number; fontName: string };
        if (!ti.str) continue;
        items.push({
            str: ti.str,
            x: ti.transform[4],
            y: ti.transform[5],
            width: ti.width,
            height: ti.height || Math.abs(ti.transform[3]) || 12,
            fontName: ti.fontName || '',
        });
    }
    return items;
}

function groupIntoLines(items: PdfTextItem[]): PdfTextItem[][] {
    if (!items.length) return [];

    // Sort by Y descending (top to bottom), then X ascending (left to right)
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Group items into lines based on Y proximity
    const lines: PdfTextItem[][] = [];
    let currentLine: PdfTextItem[] = [items[0]];
    let currentY = items[0].y;

    for (let i = 1; i < items.length; i++) {
        const item = items[i];
        // Use font height as threshold for same-line detection
        const threshold = Math.max(item.height * 0.4, 2);
        if (Math.abs(item.y - currentY) <= threshold) {
            currentLine.push(item);
        } else {
            currentLine.sort((a, b) => a.x - b.x);
            lines.push(currentLine);
            currentLine = [item];
            currentY = item.y;
        }
    }
    currentLine.sort((a, b) => a.x - b.x);
    lines.push(currentLine);

    return lines;
}

function buildLineText(items: PdfTextItem[]): string {
    if (!items.length) return '';

    let result = items[0].str;

    for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const curr = items[i];

        // Calculate gap between end of previous item and start of current
        const prevEnd = prev.x + prev.width;
        const gap = curr.x - prevEnd;

        // Estimate average character width from previous item
        const avgCharWidth = prev.str.length > 0 ? prev.width / prev.str.length : prev.height * 0.5;
        const spaceThreshold = avgCharWidth * 0.3;

        if (gap > spaceThreshold) {
            // Large gap = likely a tab/column separator
            if (gap > avgCharWidth * 4) {
                result += '\t';
            } else {
                result += ' ';
            }
        }

        result += curr.str;
    }

    return result;
}

async function extractPdfText(pdfBase64: string): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');
    if (!pdfWorkerBlobUrl) {
        const workerCode = (await import('pdfjs-dist/build/pdf.worker.min.mjs?raw')).default;
        pdfWorkerBlobUrl = URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }));
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerBlobUrl;

    const pdfBytes = base64ToUint8Array(pdfBase64);
    const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const items = extractItemsFromContent(content);
        const lines = groupIntoLines(items);
        const lineTexts: string[] = [];

        for (const lineItems of lines) {
            const text = buildLineText(lineItems);
            if (text) lineTexts.push(text);
        }

        pages.push(lineTexts.join('\n'));
    }

    return pages.join('\n\n');
}