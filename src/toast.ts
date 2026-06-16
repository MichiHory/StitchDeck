const toastContainer = document.getElementById('toast-container')!;

export function toast(msg: string, type?: 'success' | 'error'): void {
    const el = document.createElement('div');
    el.className = 'toast';
    if (type === 'success') {
        el.textContent = '\u2713 ' + msg;
        el.classList.add('success');
    } else if (type === 'error') {
        el.textContent = msg;
        el.classList.add('error');
    } else {
        el.textContent = msg;
    }
    toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    setTimeout(() => {
        el.classList.remove('show');
        el.addEventListener('transitionend', () => el.remove(), { once: true });
        // Fallback removal if transitionend doesn't fire
        setTimeout(() => el.remove(), 500);
    }, 3500);
}

/**
 * Show a toast that stays visible until the returned dismiss function is called.
 * Used as a lightweight loading indicator (e.g. while importing a dropped folder).
 */
export function persistentToast(msg: string): () => void {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    let dismissed = false;
    return () => {
        if (dismissed) return;
        dismissed = true;
        el.classList.remove('show');
        el.addEventListener('transitionend', () => el.remove(), { once: true });
        setTimeout(() => el.remove(), 500);
    };
}