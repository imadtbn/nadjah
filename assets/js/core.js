(() => {
    'use strict';

    if (window.NadjahCore?.initialized) return;

    const currentScript = document.currentScript;
    const coreBaseUrl = currentScript?.src ? new URL('.', currentScript.src) : new URL('assets/js/', document.baseURI);
    const siteRootUrl = new URL('../../', coreBaseUrl);

    function ensureUxStyles() {
        if (document.querySelector('link[data-nadjah-ux]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL('../css/ux.css', coreBaseUrl).href;
        link.dataset.nadjahUx = 'true';
        document.head.appendChild(link);
    }

    const state = {
        initialized: false,
        lenis: null,
        data: null
    };

    function loadCentralData() {
        const names = ['levels', 'subjects', 'branches', 'resources'];
        const requests = names.map((name) => {
            const url = new URL(`../data/${name}.json`, coreBaseUrl).href;
            return fetch(url, { cache: 'no-store' }).then((response) => {
                if (!response.ok) throw new Error(`${name}.json: ${response.status}`);
                return response.json();
            });
        });

        return Promise.all(requests)
            .then(([levels, subjects, branches, resources]) => {
                state.data = { levels, subjects, branches, resources };
                document.dispatchEvent(new CustomEvent('nadjah:data-ready', {
                    detail: state.data
                }));
                return state.data;
            })
            .catch((error) => {
                console.warn('تعذر تحميل قاعدة بيانات منصة النجاح:', error);
                return null;
            });
    }

    const safeQuery = (selector) => document.querySelector(selector);

    function initLoader() {
        window.addEventListener('load', () => {
            const loader = document.getElementById('loader');
            if (!loader) return;
            setTimeout(() => loader.classList.add('hidden'), 900);
        });
    }

    function initLenisAndGsap() {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const mobileLike = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;

        if (!window.gsap || !window.ScrollTrigger) return;

        gsap.registerPlugin(ScrollTrigger);

        if (reduceMotion || mobileLike || !window.Lenis) {
            document.documentElement.style.scrollBehavior = 'smooth';
            document.querySelectorAll('.reveal').forEach((el) => {
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
            return;
        }

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smooth: true
        });
        state.lenis = lenis;

        lenis.on('scroll', ScrollTrigger.update);

        const raf = (time) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);

        ScrollTrigger.create({
            start: 'top -100',
            end: 99999,
            toggleClass: {
                className: 'scrolled',
                targets: '.header'
            }
        });

        document.querySelectorAll('.reveal').forEach((el) => {
            gsap.fromTo(el, {
                opacity: 0,
                y: 50
            }, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            });
        });
    }

    function initStatistics() {
        const statsUrl = new URL('../data/site-stats.json', coreBaseUrl).href;

        fetch(statsUrl, { cache: 'no-store' })
            .then((response) => {
                if (!response.ok) throw new Error(`Statistics request failed: ${response.status}`);
                return response.json();
            })
            .then((stats) => {
                const values = {
                    resources: stats.resources,
                    levels: stats.levels,
                    subjects: stats.subjects,
                    correctedResources: stats.correctedResources,
                    correctionRate: stats.correctionRate
                };

                document.querySelectorAll('[data-stat-key]').forEach((element) => {
                    const target = Number(values[element.dataset.statKey]);
                    if (!Number.isFinite(target)) return;
                    element.textContent = String(target);

                    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                        const counter = { value: 0 };
                        gsap.to(counter, {
                            value: target,
                            duration: 1.1,
                            ease: 'power2.out',
                            onUpdate: () => {
                                element.textContent = String(Math.round(counter.value));
                            },
                            onComplete: () => {
                                element.textContent = String(target);
                            }
                        });
                    }
                });
            })
            .catch((error) => console.warn('تعذر تحميل إحصائيات الموقع الديناميكية:', error));
    }

    function initCustomCursor() {
        const cursor = document.getElementById('cursor');
        const cursorDot = document.getElementById('cursorDot');
        if (!cursor || !cursorDot || window.matchMedia('(pointer: coarse)').matches) return;

        let mouseX = 0;
        let mouseY = 0;
        let cursorX = 0;
        let cursorY = 0;

        document.addEventListener('mousemove', (event) => {
            mouseX = event.clientX;
            mouseY = event.clientY;
            cursorDot.style.left = mouseX + 'px';
            cursorDot.style.top = mouseY + 'px';
        });

        const animateCursor = () => {
            cursorX += (mouseX - cursorX) * 0.1;
            cursorY += (mouseY - cursorY) * 0.1;
            cursor.style.left = cursorX + 'px';
            cursor.style.top = cursorY + 'px';
            requestAnimationFrame(animateCursor);
        };
        animateCursor();

        document.querySelectorAll('a, button, .level-card, .subject-card, .resource-card, .year-btn, .download-btn, .doc-card, .doc-download-btn, .doc-filter, .semester-tab').forEach((el) => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });
    }

    function initStarfield() {
        const canvas = document.getElementById('starfield');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const stars = [];
        const mobileLike = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const starCount = mobileLike ? 48 : 140;
        let mouseX = -9999;
        let mouseY = -9999;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = Math.max(canvas.clientHeight || window.innerHeight, window.innerHeight);
        };
        resize();
        window.addEventListener('resize', resize, { passive: true });

        class Star {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.speedY = (Math.random() - 0.5) * 0.3;
                this.opacity = Math.random() * 0.8 + 0.2;
                this.brightness = Math.random();
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.brightness += 0.01;
                if (this.brightness > 1) this.brightness = 0;
                if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
            }
            draw() {
                const alpha = this.opacity * (0.5 + this.brightness * 0.5);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < starCount; i += 1) stars.push(new Star());

        document.addEventListener('mousemove', (event) => {
            mouseX = event.clientX;
            mouseY = event.clientY;
        }, { passive: true });

        function drawConnections() {
            for (let i = 0; i < stars.length; i += 1) {
                const star = stars[i];
                for (let j = i + 1; j < stars.length; j += 1) {
                    const other = stars[j];
                    const dx = star.x - other.x;
                    const dy = star.y - other.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq >= 10000) continue;
                    const dist = Math.sqrt(distSq);
                    ctx.beginPath();
                    ctx.moveTo(star.x, star.y);
                    ctx.lineTo(other.x, other.y);
                    ctx.strokeStyle = `rgba(212, 175, 55, ${(1 - dist / 100) * 0.12})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }

                const mdx = star.x - mouseX;
                const mdy = star.y - mouseY;
                const mouseDistSq = mdx * mdx + mdy * mdy;
                if (mouseDistSq < 22500) {
                    const dist = Math.sqrt(mouseDistSq);
                    ctx.beginPath();
                    ctx.moveTo(star.x, star.y);
                    ctx.lineTo(mouseX, mouseY);
                    ctx.strokeStyle = `rgba(212, 175, 55, ${(1 - dist / 150) * 0.25})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach((star) => {
                star.update();
                star.draw();
            });
            if (!reduceMotion && !mobileLike) drawConnections();
            if (!document.hidden && !reduceMotion) requestAnimationFrame(animate);
        };

        if (reduceMotion) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach((star) => star.draw());
        } else {
            animate();
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) requestAnimationFrame(animate);
            });
        }
    }

    function initSmoothAnchors() {
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener('click', function (event) {
                const href = this.getAttribute('href');
                if (!href || href === '#') return;
                const target = document.querySelector(href);
                if (!target) return;
                event.preventDefault();
                if (state.lenis) state.lenis.scrollTo(target, { offset: -80 });
                else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    function normalizeArabic(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u064B-\u065F\u0670]/g, '')
            .replace(/[إأآٱ]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/ؤ/g, 'و')
            .replace(/ئ/g, 'ي')
            .replace(/ة/g, 'ه')
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getResourceSearchText(item) {
        return normalizeArabic([
            item.title,
            item.subject,
            item.type,
            item.cycleId,
            item.semester ? `الفصل ${item.semester}` : '',
            ...(item.breadcrumb || []),
            ...(item.meta || [])
        ].join(' '));
    }

    function typeLabel(type) {
        return {
            exam: 'اختبار',
            homework: 'فرض',
            exercise: 'تمرين',
            revision: 'مراجعة'
        }[type] || 'نموذج';
    }

    function resourceUrl(id) {
        return new URL(`resources/${id}.html`, siteRootUrl).href;
    }

    function searchPageUrl(query) {
        const url = new URL('pages/search.html', siteRootUrl);
        if (query) url.searchParams.set('q', query);
        return url.href;
    }

    function initSearch() {
        const searchBox = safeQuery('.search-box');
        if (!searchBox) return;

        searchBox.setAttribute('autocomplete', 'off');
        searchBox.setAttribute('role', 'combobox');
        searchBox.setAttribute('aria-autocomplete', 'list');
        searchBox.setAttribute('aria-expanded', 'false');

        const container = searchBox.closest('.search-container') || searchBox.parentElement;
        if (!container) return;
        if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

        const results = document.createElement('div');
        results.className = 'nadjah-search-results';
        results.setAttribute('role', 'listbox');
        results.id = 'nadjah-search-results';
        searchBox.setAttribute('aria-controls', results.id);
        container.appendChild(results);

        let activeIndex = -1;
        let currentItems = [];

        const closeResults = () => {
            results.classList.remove('active');
            results.innerHTML = '';
            searchBox.setAttribute('aria-expanded', 'false');
            activeIndex = -1;
            currentItems = [];
        };

        const openResults = () => {
            results.classList.add('active');
            searchBox.setAttribute('aria-expanded', 'true');
        };

        const render = (query) => {
            const data = state.data?.resources?.resources || [];
            const normalized = normalizeArabic(query);
            if (!normalized) {
                closeResults();
                return;
            }

            const tokens = normalized.split(' ').filter(Boolean);
            const ranked = data
                .map((item) => {
                    const haystack = getResourceSearchText(item);
                    if (!tokens.every((token) => haystack.includes(token))) return null;
                    const title = normalizeArabic(item.title);
                    let score = tokens.reduce((total, token) => total + (title.includes(token) ? 4 : 1), 0);
                    if (item.corrected) score += .25;
                    return { item, score };
                })
                .filter(Boolean)
                .sort((a, b) => b.score - a.score)
                .slice(0, 8);

            currentItems = ranked.map((entry) => entry.item);
            results.innerHTML = '';

            if (!ranked.length) {
                const empty = document.createElement('div');
                empty.className = 'nadjah-search-empty';
                empty.textContent = 'لا توجد نتائج مطابقة';
                results.appendChild(empty);
                openResults();
                return;
            }

            ranked.forEach(({ item }, index) => {
                const link = document.createElement('a');
                link.className = 'nadjah-search-item';
                link.href = resourceUrl(item.id);
                link.setAttribute('role', 'option');
                link.dataset.searchIndex = String(index);
                link.innerHTML = `
                    <div class="nadjah-search-title">${item.title}</div>
                    <div class="nadjah-search-meta">
                        <span>${item.subject || 'مادة تعليمية'}</span>
                        <span>• ${typeLabel(item.type)}</span>
                        ${item.semester ? `<span>• الفصل ${item.semester}</span>` : ''}
                        ${item.corrected ? '<span>• مع التصحيح</span>' : ''}
                    </div>
                `;
                results.appendChild(link);
            });

            const all = document.createElement('a');
            all.className = 'nadjah-search-all';
            all.href = searchPageUrl(query);
            all.textContent = 'عرض جميع النتائج';
            results.appendChild(all);
            openResults();
        };

        searchBox.addEventListener('input', (event) => render(event.target.value));

        searchBox.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                if (activeIndex >= 0 && currentItems[activeIndex]) {
                    event.preventDefault();
                    window.location.href = resourceUrl(currentItems[activeIndex].id);
                    return;
                }
                const query = searchBox.value.trim();
                if (query) {
                    event.preventDefault();
                    window.location.href = searchPageUrl(query);
                }
                return;
            }

            if (!results.classList.contains('active') || !currentItems.length) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                activeIndex += event.key === 'ArrowDown' ? 1 : -1;
                if (activeIndex < 0) activeIndex = currentItems.length - 1;
                if (activeIndex >= currentItems.length) activeIndex = 0;
                results.querySelectorAll('.nadjah-search-item').forEach((item, index) => {
                    item.toggleAttribute('data-active', index === activeIndex);
                    if (index === activeIndex) item.focus();
                });
            } else if (event.key === 'Escape') {
                closeResults();
                searchBox.focus();
            }
        });

        document.addEventListener('click', (event) => {
            if (!container.contains(event.target)) closeResults();
        });

        state.dataReady?.then(() => {
            if (searchBox.value.trim()) render(searchBox.value);
        });
    }

    function initUserHubLink() {
        document.querySelectorAll('.nav-links').forEach((nav) => {
            if (nav.querySelector('a[href*="my.html"]')) return;
            const link = document.createElement('a');
            link.href = new URL('pages/my.html', siteRootUrl).href;
            link.textContent = 'مساحتي';
            link.className = 'user-hub-nav-link';
            nav.appendChild(link);
        });
    }

    function initMobileMenu() {
        const button = safeQuery('.mobile-toggle');
        const nav = safeQuery('.nav-links');
        if (!button || !nav) return;

        button.setAttribute('aria-label', button.getAttribute('aria-label') || 'فتح القائمة');
        button.setAttribute('aria-expanded', 'false');

        button.addEventListener('click', () => {
            const open = nav.classList.toggle('active');
            button.setAttribute('aria-expanded', String(open));
        });

        nav.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                button.setAttribute('aria-expanded', 'false');
            });
        });
    }

    function initScrollTop() {
        const button = document.getElementById('scrollTopBtn');
        if (!button) return;

        const update = () => button.classList.toggle('show', window.scrollY > 400);
        window.addEventListener('scroll', update, { passive: true });
        update();

        button.addEventListener('click', () => {
            if (state.lenis) state.lenis.scrollTo(0);
            else window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    function initUserFeatures() {
        if (window.NadjahUser || document.querySelector('script[data-nadjah-user]')) return;
        const script = document.createElement('script');
        script.src = new URL('user-state.js', coreBaseUrl).href;
        script.defer = true;
        script.dataset.nadjahUser = 'true';
        document.head.appendChild(script);
    }

    function initPwa() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                const swUrl = new URL('../../service-worker.js', coreBaseUrl).href;
                navigator.serviceWorker.register(swUrl).catch((error) => {
                    console.warn('تعذر تسجيل Service Worker:', error);
                });
            });
        }

        const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (standalone) return;

        let installPrompt = null;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'nadjah-install-btn';
        button.innerHTML = '<i class="fas fa-download" aria-hidden="true"></i><span>تثبيت المنصة</span>';
        button.hidden = true;
        button.setAttribute('aria-label', 'تثبيت منصة النجاح');
        document.body.appendChild(button);

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            installPrompt = event;
            button.hidden = false;
        });

        button.addEventListener('click', async () => {
            if (!installPrompt) return;
            installPrompt.prompt();
            try {
                await installPrompt.userChoice;
            } finally {
                installPrompt = null;
                button.hidden = true;
            }
        });

        window.addEventListener('appinstalled', () => {
            installPrompt = null;
            button.hidden = true;
        });
    }

    function init() {
        if (state.initialized) return;
        state.initialized = true;
        ensureUxStyles();
        state.dataReady = loadCentralData();
        initLoader();
        initUserFeatures();
        initPwa();
        initLenisAndGsap();
        initStatistics();
        initCustomCursor();
        initStarfield();
        initSmoothAnchors();
        initSearch();
        initUserHubLink();
        initMobileMenu();
        initScrollTop();
    }

    window.NadjahCore = {
        initialized: true,
        state,
        init,
        get lenis() { return state.lenis; },
        get data() { return state.data; },
        get dataReady() { return state.dataReady; },
        findResource(id) {
            return state.data?.resources?.resources?.find((item) => item.id === id) || null;
        },
        searchResources(query) {
            const normalized = normalizeArabic(query);
            if (!normalized) return state.data?.resources?.resources || [];
            const tokens = normalized.split(' ').filter(Boolean);
            return (state.data?.resources?.resources || [])
                .filter((item) => {
                    const haystack = getResourceSearchText(item);
                    return tokens.every((token) => haystack.includes(token));
                });
        },
        resourceUrl,
        searchPageUrl,
        findSubject(id) {
            return state.data?.subjects?.subjects?.find((item) => item.id === id) || null;
        },
        findBranch(id) {
            return state.data?.branches?.branches?.find((item) => item.id === id) || null;
        },
        findLevel(id) {
            for (const cycle of state.data?.levels?.cycles || []) {
                const level = cycle.levels?.find((item) => item.id === id);
                if (level) return level;
            }
            return null;
        }
    };

    init();
})();