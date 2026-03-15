const toastEl = document.getElementById('toast')!;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(msg: string, type?: 'success'): void {
    toastEl.classList.remove('success');
    if (type === 'success') {
        toastEl.textContent = '\u2713 ' + msg;
        toastEl.classList.add('success');
    } else {
        toastEl.textContent = msg;
    }
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastEl.classList.remove('show', 'success');
    }, 3500);
}