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
    updateSubjectStatistics();
}).catch((error) => console.error('تعذر تحميل وظائف منصة النجاح المشتركة:', error));

function updateSubjectStatistics() {
    const cards = [...document.querySelectorAll('.doc-card[data-resource-id], .doc-card')];

    // Subject landing pages load their cards asynchronously. Their counters are
    // generated from resources.json during the build, so never replace those
    // authoritative values with a temporary 0 before the cards arrive.
    if (!cards.length) return;

    const corrected = cards.filter((card) =>
        card.querySelector('.solution-badge.with-solution') ||
        /مع التصحيح/.test(card.textContent || '')
    ).length;

    const values = {
        resources: cards.length,
        correctionRate: Math.round((corrected / cards.length) * 100)
    };

    document.querySelectorAll('[data-subject-stat]').forEach((element) => {
        const value = values[element.dataset.subjectStat];
        if (value === undefined) return;

        if (element.dataset.subjectStat === 'resources') {
            element.innerHTML = `${value} <small>نموذج</small>`;
        } else if (element.dataset.subjectStat === 'correctionRate') {
            element.innerHTML = `${value}% <small>مصحح</small>`;
        } else {
            element.textContent = String(value);
        }
    });
}

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

window.filterDocs = function filterDocs(type, source) {
    const normalizedType = String(type || 'all').trim();

    document.querySelectorAll('.doc-filter').forEach((filter) => {
        filter.classList.remove('active');
        filter.setAttribute('aria-pressed', 'false');
    });

    const trigger = source || window.event?.currentTarget;
    if (trigger?.classList) {
        trigger.classList.add('active');
        trigger.setAttribute('aria-pressed', 'true');
    }

    const scope = document.querySelector('.semester-content.active') || document;
    const cards = [...scope.querySelectorAll('.doc-card')];

    cards.forEach((card) => {
        const cardType = String(card.dataset.type || '').trim();
        const show = normalizedType === 'all' || cardType === normalizedType;

        if (window.gsap) {
            gsap.killTweensOf(card);
            gsap.set(card, { clearProps: 'opacity,transform,visibility' });
        }

        card.hidden = !show;
        card.setAttribute('aria-hidden', String(!show));
        card.style.removeProperty('display');

        if (show) {
            card.style.opacity = '1';
            card.style.visibility = 'visible';
            card.style.transform = 'none';
        } else {
            card.style.removeProperty('opacity');
            card.style.removeProperty('visibility');
            card.style.removeProperty('transform');
        }
    });

    if (window.ScrollTrigger?.refresh) {
        requestAnimationFrame(() => window.ScrollTrigger.refresh());
    }
};

window.downloadDoc = function downloadDoc(button) {
    if (!button) return;
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
    button.style.background = 'var(--gold)';
    button.style.color = 'var(--void)';

    setTimeout(() => {
        button.innerHTML = '<i class="fas fa-check"></i> تم التحميل!';
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.style.background = '';
            button.style.color = '';
        }, 1500);
    }, 700);
};

window.previewPDF = function previewPDF(url) {
    const viewer = document.getElementById('pdfViewer');
    const modal = document.getElementById('pdfModal');
    if (!viewer || !modal || !url) return;
    viewer.src = url;
    modal.classList.add('active');
};

window.closePDFPreview = function closePDFPreview() {
    const viewer = document.getElementById('pdfViewer');
    const modal = document.getElementById('pdfModal');
    if (!modal) return;
    modal.classList.remove('active');
    if (viewer) viewer.src = '';
};
