const scriptElement = document.currentScript;
function ensureNadjahCore() {
    if (window.NadjahCore) return Promise.resolve(window.NadjahCore);

    const existing = document.querySelector('script[data-nadjah-core]');
    if (existing) {
        return new Promise((resolve, reject) => {
            existing.addEventListener('load', () => resolve(window.NadjahCore), { once: true });
            existing.addEventListener('error', reject, { once: true });
        });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL('core.js', scriptElement.src).href;
        script.defer = true;
        script.dataset.nadjahCore = 'true';
        script.onload = () => resolve(window.NadjahCore);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

ensureNadjahCore().then(() => {
    // إحصائيات السنة تحسب من البطاقات الظاهرة في الصفحة نفسها.
    document.querySelectorAll('[data-subject-stat="resources"]').forEach((element) => {
        const total = [...document.querySelectorAll('.subject-count')].reduce((sum, item) => {
            const match = item.textContent.match(/\d+/);
            return sum + (match ? Number(match[0]) : 0);
        }, 0);

        if (total > 0) {
            element.innerHTML = `${total} <small>نموذج</small>`;
        }
    });
}).catch((error) => console.error('تعذر تحميل وظائف منصة النجاح المشتركة:', error));

window.switchSemester = function switchSemester(num) {
    document.querySelectorAll('.semester-tab').forEach((tab) => {
        tab.classList.toggle('active', Number(tab.dataset.semester) === Number(num));
    });

    document.querySelectorAll('.semester-content').forEach((content) => content.classList.remove('active'));
    const target = document.getElementById('semester-' + num);
    if (!target) return;

    target.classList.add('active');

    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(target.querySelectorAll('.reveal'), {
            opacity: 0,
            y: 30
        }, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
            stagger: 0.08
        });
    }
};
