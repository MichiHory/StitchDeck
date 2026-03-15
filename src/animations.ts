export function burstAndRegrow(el: HTMLElement, rect: DOMRect): void {
    const PARTICLE_COUNT = 18;
    const colors = ['#22c55e', '#4ade80', '#16a34a', '#86efac', '#bbf7d0', '#a3e635'];
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = document.createElement('div');
        p.className = 'burst-particle';
        const w = 4 + Math.random() * 8;
        const h = 3 + Math.random() * 6;
        p.style.width = w + 'px';
        p.style.height = h + 'px';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];

        let sx: number, sy: number;
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { sx = rect.left + Math.random() * rect.width; sy = rect.top; }
        else if (edge === 1) { sx = rect.left + Math.random() * rect.width; sy = rect.bottom; }
        else if (edge === 2) { sx = rect.left; sy = rect.top + Math.random() * rect.height; }
        else { sx = rect.right; sy = rect.top + Math.random() * rect.height; }

        p.style.left = sx + 'px';
        p.style.top = sy + 'px';

        const angle = Math.atan2(sy - cy, sx - cx) + (Math.random() - .5) * .8;
        const dist = 40 + Math.random() * 80;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist + (Math.random() * 20 - 5);
        const rot = (Math.random() - .5) * 360;
        const dur = 350 + Math.random() * 250;

        document.body.appendChild(p);

        p.animate([
            { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
            { transform: `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(.2)`, opacity: 0 }
        ], { duration: dur, easing: 'cubic-bezier(.25,.46,.45,.94)', fill: 'forwards' })
            .onfinish = () => p.remove();
    }

    el.classList.add('grow-in');
    el.addEventListener('animationend', () => {
        el.classList.add('settled');
        setTimeout(() => {
            el.classList.remove('grow-in', 'settled');
        }, 500);
    }, { once: true });
}