import { getCurrentLang } from './i18n';
import { helpBtn, helpPage, mainContentEl } from './dom';

import docEn from './docs/en.md?raw';
import docCs from './docs/cs.md?raw';

const docs: Record<string, string> = { en: docEn, cs: docCs };

interface Section {
    id: string;
    title: string;
    html: string;
}

interface ParsedDoc {
    title: string;
    subtitle: string;
    sections: Section[];
}

function slugify(text: string): string {
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function inlineMarkdown(text: string): string {
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return text;
}

function parseMarkdown(md: string): ParsedDoc {
    const lines = md.split('\n');
    let title = '';
    let subtitle = '';
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let buffer: string[] = [];
    let inList = false;
    let titleFound = false;

    function flushBuffer() {
        if (!currentSection) return;
        if (inList) {
            currentSection.html += '</ul>';
            inList = false;
        }
        if (buffer.length > 0) {
            const text = buffer.join(' ').trim();
            if (text) {
                currentSection.html += `<p>${inlineMarkdown(text)}</p>`;
            }
            buffer = [];
        }
    }

    for (const line of lines) {
        const trimmed = line.trim();

        // H1 — doc title
        if (trimmed.startsWith('# ') && !titleFound) {
            title = trimmed.slice(2).trim();
            titleFound = true;
            continue;
        }

        // Subtitle — first non-empty line after title, before any ##
        if (titleFound && !subtitle && !trimmed.startsWith('#') && trimmed) {
            subtitle = inlineMarkdown(trimmed);
            continue;
        }

        // H2 — new section
        if (trimmed.startsWith('## ')) {
            if (currentSection) {
                flushBuffer();
            }
            const sectionTitle = trimmed.slice(3).trim();
            currentSection = {
                id: slugify(sectionTitle),
                title: sectionTitle,
                html: '',
            };
            sections.push(currentSection);
            continue;
        }

        if (!currentSection) continue;

        // H3 — subsection
        if (trimmed.startsWith('### ')) {
            flushBuffer();
            currentSection.html += `<h3>${inlineMarkdown(trimmed.slice(4).trim())}</h3>`;
            continue;
        }

        // List item
        if (trimmed.startsWith('- ')) {
            if (buffer.length > 0) {
                const text = buffer.join(' ').trim();
                if (text) currentSection.html += `<p>${inlineMarkdown(text)}</p>`;
                buffer = [];
            }
            if (!inList) {
                currentSection.html += '<ul>';
                inList = true;
            }
            currentSection.html += `<li>${inlineMarkdown(trimmed.slice(2).trim())}</li>`;
            continue;
        }

        // Empty line
        if (!trimmed) {
            if (inList) {
                currentSection.html += '</ul>';
                inList = false;
            }
            if (buffer.length > 0) {
                const text = buffer.join(' ').trim();
                if (text) currentSection.html += `<p>${inlineMarkdown(text)}</p>`;
                buffer = [];
            }
            continue;
        }

        // Regular text — accumulate into paragraph
        buffer.push(trimmed);
    }

    if (currentSection) flushBuffer();

    return { title, subtitle, sections };
}

function renderHelpPage(): void {
    const lang = getCurrentLang();
    const md = docs[lang] || docs.en;
    const doc = parseMarkdown(md);

    const navTitle = lang === 'cs' ? 'Obsah' : 'Contents';
    const backText = lang === 'cs' ? 'Zpět do aplikace' : 'Back to app';

    const navLinks = doc.sections.map(s =>
        `<button class="help-nav-link" data-section="${s.id}">${s.title}</button>`
    ).join('');

    const content = doc.sections.map(s =>
        `<div class="help-section" id="help-${s.id}">
            <h2>${s.title}</h2>
            ${s.html}
        </div>`
    ).join('');

    helpPage.innerHTML = `
        <div class="help-container">
            <nav class="help-nav">
                <div class="help-nav-title">${navTitle}</div>
                <div class="help-nav-list">${navLinks}</div>
            </nav>
            <div class="help-content-scroll">
                <div class="help-content">
                    <button class="help-back-btn" id="helpBackBtn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        ${backText}
                    </button>
                    <h1>${doc.title}</h1>
                    <p class="help-subtitle">${doc.subtitle}</p>
                    ${content}
                </div>
            </div>
        </div>
    `;

    // Back button
    helpPage.querySelector('#helpBackBtn')!.addEventListener('click', hideHelp);

    // Nav links — scroll to section
    const scrollContainer = helpPage.querySelector('.help-content-scroll')!;
    helpPage.querySelectorAll<HTMLButtonElement>('.help-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const sectionId = link.dataset.section!;
            const target = helpPage.querySelector(`#help-${sectionId}`) as HTMLElement | null;
            if (target) {
                const containerRect = scrollContainer.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollTop + targetRect.top - containerRect.top - 16,
                    behavior: 'smooth',
                });
            }
            helpPage.querySelectorAll('.help-nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Track active section on scroll
    scrollContainer.addEventListener('scroll', () => {
        const sectionEls = helpPage.querySelectorAll<HTMLElement>('.help-section');
        let activeId = doc.sections[0]?.id;
        for (const el of sectionEls) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 120) {
                activeId = el.id.replace('help-', '');
            }
        }
        helpPage.querySelectorAll('.help-nav-link').forEach(l => {
            l.classList.toggle('active', (l as HTMLButtonElement).dataset.section === activeId);
        });
    });
}

export function showHelp(): void {
    renderHelpPage();
    helpPage.classList.add('visible');
    mainContentEl.style.display = 'none';
    const scrollContainer = helpPage.querySelector('.help-content-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
    const firstLink = helpPage.querySelector('.help-nav-link');
    if (firstLink) firstLink.classList.add('active');
    if (window.location.hash !== '#help') {
        history.pushState(null, '', '#help');
    }
}

export function hideHelp(): void {
    helpPage.classList.remove('visible');
    mainContentEl.style.display = '';
    if (window.location.hash === '#help') {
        history.pushState(null, '', window.location.pathname + window.location.search);
    }
}

export function isHelpVisible(): boolean {
    return helpPage.classList.contains('visible');
}

export function refreshHelp(): void {
    if (!isHelpVisible()) return;
    renderHelpPage();
    const firstLink = helpPage.querySelector('.help-nav-link');
    if (firstLink) firstLink.classList.add('active');
}

export function initHelp(): void {
    helpBtn.addEventListener('click', showHelp);

    // Handle browser back/forward and direct #help URL
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#help') {
            if (!isHelpVisible()) showHelp();
        } else {
            if (isHelpVisible()) {
                helpPage.classList.remove('visible');
                mainContentEl.style.display = '';
            }
        }
    });

    // Open help if page loaded with #help in URL
    if (window.location.hash === '#help') {
        showHelp();
    }
}