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

import {MAX_DISPLAY_LINES, state} from './state';
import {countTokens, escapeHtml, formatSize, formatTokens, getLanguage} from './helpers';
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
    togglePaths,
    togglePdfToText,
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

export function initMerge(): void {
    // Toggle persistence
    togglePaths.checked = localStorage.getItem('fmerge_togglePaths') !== 'false';
    toggleTrimEmpty.checked = localStorage.getItem('fmerge_toggleTrimEmpty') === 'true';
    togglePdfToText.checked = localStorage.getItem('fmerge_togglePdfToText') !== 'false';
    togglePaths.addEventListener('change', () => localStorage.setItem('fmerge_togglePaths', String(togglePaths.checked)));
    toggleTrimEmpty.addEventListener('change', () => localStorage.setItem('fmerge_toggleTrimEmpty', String(toggleTrimEmpty.checked)));
    togglePdfToText.addEventListener('change', () => localStorage.setItem('fmerge_togglePdfToText', String(togglePdfToText.checked)));

    // Merge
    mergeBtn.addEventListener('click', async () => {
        if (!state.files.length) return;

        mergeBtn.disabled = true;
        mergeBtn.querySelector('[data-i18n]')!.textContent = t('loading');

        try {
            const plainLinesArray: string[] = [];
            const htmlLinesArray: string[] = [];

            const includePaths = togglePaths.checked;
            const trimEmpty = toggleTrimEmpty.checked;
            const pdfToText = togglePdfToText.checked;

            for (let i = 0; i < state.files.length; i++) {
                const entry = state.files[i];

                // Custom text entries — treat like .md files
                if (entry.isCustomText) {
                    let contentStr = entry.content || '';
                    if (trimEmpty) {
                        contentStr = contentStr.replace(/^\n+/, '').replace(/\n+$/, '');
                    }
                    if (entry.includeTitle && entry.customTitle) {
                        plainLinesArray.push(`${entry.customTitle}:`);
                        htmlLinesArray.push(`<span style="color: #a78bfa; font-weight: 700;">${escapeHtml(entry.customTitle)}:</span>`);
                    }
                    const plainContentLines = contentStr.split('\n');
                    plainLinesArray.push(...plainContentLines);
                    htmlLinesArray.push(...plainContentLines.map(l => escapeHtml(l)));
                    if (i < state.files.length - 1) {
                        plainLinesArray.push('');
                        htmlLinesArray.push('');
                    }
                    continue;
                }

                if (entry.pdfData) {
                    if (pdfToText) {
                        let contentStr = await extractPdfText(entry.pdfData);
                        if (trimEmpty) {
                            contentStr = contentStr.replace(/^\n+/, '').replace(/\n+$/, '');
                        }
                        if (includePaths) {
                            plainLinesArray.push(`${entry.path}:`);
                            htmlLinesArray.push(`<span style="color: #27db0f; font-weight: 700;">${escapeHtml(entry.path)}:</span>`);
                        }
                        const lines = contentStr.split('\n');
                        plainLinesArray.push(...lines);
                        htmlLinesArray.push(...lines.map(l => escapeHtml(l)));
                    } else {
                        if (includePaths) {
                            plainLinesArray.push(`${entry.path}:`);
                            htmlLinesArray.push(`<span style="color: #27db0f; font-weight: 700;">${escapeHtml(entry.path)}:</span>`);
                        }
                        const placeholder = `[PDF \u2013 ${t('pdfBinaryContent')}]`;
                        plainLinesArray.push(placeholder);
                        htmlLinesArray.push(`<span style="color: var(--text-dim); font-style: italic;">${escapeHtml(placeholder)}</span>`);
                    }
                    if (i < state.files.length - 1) {
                        plainLinesArray.push('');
                        htmlLinesArray.push('');
                    }
                    continue;
                }

                let contentStr = entry.content || '';
                const lang = getLanguage(entry.path);

                if (trimEmpty) {
                    contentStr = contentStr.replace(/^\n+/, '').replace(/\n+$/, '');
                }

                if (includePaths) {
                    plainLinesArray.push(`${entry.path}:`);
                }
                const plainContentLines = contentStr.split('\n');
                plainLinesArray.push(...plainContentLines);

                if (includePaths) {
                    const pathLineHtml = `<span style="color: #27db0f; font-weight: 700;">${escapeHtml(entry.path)}:</span>`;
                    htmlLinesArray.push(pathLineHtml);
                }

                let highlightedContent = '';
                if (lang !== 'plaintext' && hljs.getLanguage(lang)) {
                    highlightedContent = hljs.highlight(contentStr, { language: lang, ignoreIllegals: true }).value;
                } else {
                    highlightedContent = escapeHtml(contentStr);
                }

                const highlightedContentLines = highlightedContent.split('\n');
                htmlLinesArray.push(...highlightedContentLines);

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