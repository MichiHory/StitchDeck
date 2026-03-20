import { escapeHtml } from './helpers';
import { t } from './i18n';

interface ModalOptions {
    title: string;
    body?: string;
    inputValue?: string;
    placeholder?: string;
    confirmText?: string;
    confirmClass?: string;
    showInput?: boolean;
    resolveData?: (overlay: HTMLElement) => unknown;
    validate?: (overlay: HTMLElement) => string | null;
    modalClass?: string;
}

export function showModal(options: ModalOptions): Promise<unknown> {
    const {
        title,
        body,
        inputValue,
        placeholder,
        confirmText = 'OK',
        confirmClass = 'btn-primary',
        showInput = false,
        resolveData = null,
        validate = null,
        modalClass = '',
    } = options;

    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal ${modalClass}">
                <div class="modal-title">${escapeHtml(title)}</div>
                ${body ? `<div class="modal-body">${body}</div>` : ''}
                ${showInput ? `<input class="modal-input" type="text" value="${escapeHtml(inputValue || '')}" placeholder="${escapeHtml(placeholder || '')}">` : ''}
                <div class="modal-error" style="display:none"></div>
                <div class="modal-buttons">
                    <button class="btn btn-secondary modal-cancel">${escapeHtml(t('cancel'))}</button>
                    <button class="btn ${confirmClass} modal-confirm">${escapeHtml(confirmText)}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));

        const input = overlay.querySelector<HTMLInputElement>('.modal-input');
        const confirmBtn = overlay.querySelector<HTMLButtonElement>('.modal-confirm')!;
        const cancelBtn = overlay.querySelector<HTMLButtonElement>('.modal-cancel')!;

        if (input) {
            input.focus();
            input.select();
        } else {
            confirmBtn.focus();
        }

        function close(value: unknown) {
            overlay.classList.remove('visible');
            overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
            resolve(value);
        }

        const errorEl = overlay.querySelector<HTMLElement>('.modal-error')!;

        confirmBtn.addEventListener('click', () => {
            if (validate) {
                const err = validate(overlay);
                if (err) {
                    errorEl.textContent = err;
                    errorEl.style.display = '';
                    return;
                }
                errorEl.style.display = 'none';
            }
            if (resolveData) {
                close(resolveData(overlay));
            } else {
                close(showInput ? (input!.value.trim() || null) : true);
            }
        });
        cancelBtn.addEventListener('click', () => close(null));
        overlay.addEventListener('click', e => {
            if (e.target === overlay) close(null);
        });
        if (input) {
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') confirmBtn.click();
                if (e.key === 'Escape') close(null);
            });
        }
        overlay.addEventListener('keydown', e => {
            if (e.key === 'Escape') close(null);
        });
    });
}