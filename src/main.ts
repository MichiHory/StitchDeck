import './styles/main.css';
import 'highlight.js/styles/atom-one-dark.css';

import { applyTranslations } from './i18n';
import { renderLangSwitcher } from './lang-switcher';
import { initThemeToggle } from './theme-toggle';
import { initProjects, createNewProject } from './projects';
import { initDropzone } from './dropzone';
import { initMerge } from './merge';
import { newProjectBtn } from './dom';

// Init theme
initThemeToggle();

// Init i18n
renderLangSwitcher();
applyTranslations();

// Init dropzone
initDropzone();

// Init merge, copy, download, clear
initMerge();

// New project button
newProjectBtn.addEventListener('click', () => createNewProject());

// Init projects (load from IndexedDB)
initProjects();