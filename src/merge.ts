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

import { state, MAX_DISPLAY_LINES } from './state';
import { escapeHtml, formatSize, getLanguage } from './helpers';
import { t } from './i18n';
import { toast } from './toast';
import { showModal } from './modal';
import { renderFileList } from './file-list';
import { scheduleSave } from './projects';
import { base64ToUint8Array } from './pdf';
import {
    mergeBtn, clearBtn, copyBtn, downloadBtn, downloadPdfBtn,
    outputSection, outputContent, lineNumbers, outputMeta,
    truncationWarning, togglePaths, toggleTrimEmpty,
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
    togglePaths.addEventListener('change', () => localStorage.setItem('fmerge_togglePaths', String(togglePaths.checked)));
    toggleTrimEmpty.addEventListener('change', () => localStorage.setItem('fmerge_toggleTrimEmpty', String(toggleTrimEmpty.checked)));

    // Merge
    mergeBtn.addEventListener('click', async () => {
        if (!state.files.length) return;

        mergeBtn.disabled = true;
        mergeBtn.textContent = t('loading');

        try {
            const plainLinesArray: string[] = [];
            const htmlLinesArray: string[] = [];

            const includePaths = togglePaths.checked;
            const trimEmpty = toggleTrimEmpty.checked;

            for (let i = 0; i < state.files.length; i++) {
                const entry = state.files[i];

                if (entry.pdfData) {
                    if (includePaths) {
                        plainLinesArray.push(`${entry.path}:`);
                        htmlLinesArray.push(`<span style="color: #39ff14; font-weight: 700;">${escapeHtml(entry.path)}:</span>`);
                    }
                    const placeholder = `[PDF \u2013 ${t('pdfBinaryContent')}]`;
                    plainLinesArray.push(placeholder);
                    htmlLinesArray.push(`<span style="color: var(--text-dim); font-style: italic;">${escapeHtml(placeholder)}</span>`);
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
                    const pathLineHtml = `<span style="color: #39ff14; font-weight: 700;">${escapeHtml(entry.path)}:</span>`;
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

            outputMeta.textContent = t('outputMeta', { files: totalFiles, lines: totalLines.toLocaleString(), size: totalSize });
            outputSection.style.display = 'block';
            outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (err) {
            toast(t('errorReadingFiles', { message: (err as Error).message }));
        }

        mergeBtn.disabled = false;
        mergeBtn.textContent = t('mergeFiles');
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
        downloadPdfBtn.textContent = t('loading');

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
                    if (includePaths) {
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
        downloadPdfBtn.textContent = t('downloadPdf');
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