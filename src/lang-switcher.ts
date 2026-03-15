import { getCurrentLang, setCurrentLang, getAvailableLangs, applyTranslations } from './i18n';
import type { LangKey } from './i18n';
import { renderFileList } from './file-list';
import { renderProjectList } from './projects';
import { langSwitcher } from './dom';

export function renderLangSwitcher(): void {
    langSwitcher.innerHTML = '';
    const currentLang = getCurrentLang();
    for (const lang of getAvailableLangs()) {
        const btn = document.createElement('button');
        btn.className = 'lang-btn' + (lang === currentLang ? ' active' : '');
        btn.textContent = lang.toUpperCase();
        btn.addEventListener('click', () => {
            if (lang === currentLang) return;
            setCurrentLang(lang as LangKey);
            applyTranslations();
            renderLangSwitcher();
            renderFileList();
            renderProjectList();
        });
        langSwitcher.appendChild(btn);
    }
}