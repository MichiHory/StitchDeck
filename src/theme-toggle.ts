type Theme = 'dark' | 'light';

const STORAGE_KEY = 'stitchdeck_theme';

function getStoredTheme(): Theme {
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark';
}

function applyTheme(theme: Theme): void {
    document.documentElement.classList.toggle('light', theme === 'light');
}

export function initThemeToggle(): void {
    const theme = getStoredTheme();
    applyTheme(theme);

    const btn = document.getElementById('themeToggle')!;
    btn.addEventListener('click', () => {
        const next: Theme = document.documentElement.classList.contains('light') ? 'dark' : 'light';
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
    });
}