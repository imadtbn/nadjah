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
        data: null,
        dataReady: null,
        resourceReady: null,
        statsReady: null
    };

    const jsonRequests = new Map();

    function loadJson(name) {
        if (jsonRequests.has(name)) return jsonRequests.get(name);

        const url = new URL(`../data/${name}.json`, coreBaseUrl).href;
        const request = fetch(url, { cache: 'default' })
            .then((response) => {
                if (!response.ok) throw new Error(`${name}.json: ${response.status}`);
                return response.json();
            })
            .catch((error) => {
                jsonRequests.delete(name);
                throw error;
            });

        jsonRequests.set(name, request);
        return request;
    }

    function loadCentralData() {
        return Promise.all(['levels', 'subjects', 'branches'].map(loadJson))
            .then(([levels, subjects, branches]) => {
                state.data = { ...(state.data || {}), levels, subjects, branches };
                document.dispatchEvent(new CustomEvent('nadjah:data-ready', {
                    detail: state.data
                }));
                return state.data;
            })
            .catch((error) => {
                console.warn('تعذر تحميل بيانات التصفح في منصة النجاح:', error);
                return null;
            });
    }

    function loadResources() {
        if (state.data?.resources) return Promise.resolve(state.data);
        if (state.resourceReady) return state.resourceReady;

        state.resourceReady = loadJson('resources')
            .then((resources) => {
                state.data = { ...(state.data || {}), resources };
                document.dispatchEvent(new CustomEvent('nadjah:resources-ready', {
                    detail: state.data
                }));
                return state.data;
            })
            .catch((error) => {
                state.resourceReady = null;
                console.warn('تعذر تحميل فهرس النماذج:', error);
                return null;
            });

        return state.resourceReady;
    }

    function loadStatistics() {
        if (state.data?.stats) return Promise.resolve(state.data.stats);
        if (state.statsReady) return state.statsReady;

        state.statsReady = loadJson('site-stats')
            .then((stats) => {
                state.data = { ...(state.data || {}), stats };
                return stats;
            })
            .catch((error) => {
                state.statsReady = null;
                console.warn('تعذر تحميل إحصائيات الموقع:', error);
                return null;
            });

        return state.statsReady;
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
        const revealElements = document.querySelectorAll('.reveal');
        const showReveals = () => {
            revealElements.forEach((element) => {
                element.style.opacity = '1';
                element.style.transform = 'none';
            });
        };

        if (!window.gsap || !window.ScrollTrigger) {
            showReveals();
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        if (reduceMotion || mobileLike) {
            document.documentElement.style.scrollBehavior = 'smooth';
            showReveals();
            return;
        }

        if (window.Lenis) {
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
        }

        ScrollTrigger.create({
            start: 'top -100',
            end: 99999,
            toggleClass: {
                className: 'scrolled',
                targets: '.header'
            }
        });

        revealElements.forEach((el) => {
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
        if (!document.querySelector('[data-stat-key]')) return;

        loadStatistics().then((stats) => {
            if (!stats) return;

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
        });
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
        searchBox.setAttribute('aria-haspopup', 'listbox');
        searchBox.setAttribute('aria-expanded', 'false');

        const container = searchBox.closest('.search-container') || searchBox.parentElement;
        if (!container) return;
        if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

        const results = document.createElement('div');
        results.className = 'nadjah-search-results';
        results.setAttribute('role', 'region');
        results.setAttribute('aria-label', 'اقتراحات البحث');
        results.id = 'nadjah-search-results';
        searchBox.setAttribute('aria-controls', results.id);
        container.appendChild(results);

        let activeIndex = -1;
        let currentItems = [];
        let requestId = 0;

        const closeResults = () => {
            results.classList.remove('active');
            results.replaceChildren();
            searchBox.setAttribute('aria-expanded', 'false');
            searchBox.removeAttribute('aria-activedescendant');
            activeIndex = -1;
            currentItems = [];
        };

        const openResults = () => {
            results.classList.add('active');
            searchBox.setAttribute('aria-expanded', 'true');
        };

        const showMessage = (message, { retry = false, query = '' } = {}) => {
            results.replaceChildren();
            const status = document.createElement('div');
            status.className = retry ? 'nadjah-search-empty nadjah-search-error' : 'nadjah-search-empty';
            status.setAttribute('role', 'status');
            status.textContent = message;
            results.appendChild(status);

            if (retry) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'nadjah-search-retry';
                button.textContent = 'إعادة المحاولة';
                button.addEventListener('click', () => runSearch(query, true));
                results.appendChild(button);
            } else if (query) {
                const all = document.createElement('a');
                all.className = 'nadjah-search-all';
                all.href = searchPageUrl(query);
                all.textContent = 'فتح البحث المتقدم';
                results.appendChild(all);
            }
            currentItems = [];
            activeIndex = -1;
            searchBox.removeAttribute('aria-activedescendant');
            openResults();
        };

        const render = (query, catalog) => {
            const normalized = normalizeArabic(query);
            if (!normalized) {
                closeResults();
                return;
            }
            if (!catalog || !Array.isArray(catalog.resources)) {
                showMessage('تعذر تحميل نتائج البحث. تحقق من الاتصال ثم أعد المحاولة.', { retry: true, query });
                return;
            }

            const data = catalog.resources;
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
            activeIndex = -1;
            searchBox.removeAttribute('aria-activedescendant');
            results.replaceChildren();

            if (!ranked.length) {
                showMessage('لا توجد نتائج مطابقة. جرّب كلمات أخرى أو افتح البحث المتقدم.', { query });
                return;
            }

            const options = document.createElement('div');
            options.className = 'nadjah-search-options';
            options.setAttribute('role', 'listbox');
            options.id = 'nadjah-search-options';
            results.appendChild(options);

            ranked.forEach(({ item }, index) => {
                const link = document.createElement('a');
                link.className = 'nadjah-search-item';
                link.href = resourceUrl(item.id);
                link.id = `nadjah-search-option-${index}`;
                link.setAttribute('role', 'option');
                link.setAttribute('aria-selected', 'false');
                link.dataset.searchIndex = String(index);

                const title = document.createElement('div');
                title.className = 'nadjah-search-title';
                title.textContent = item.title || 'نموذج تعليمي';
                link.appendChild(title);

                const meta = document.createElement('div');
                meta.className = 'nadjah-search-meta';
                const addMeta = (text) => {
                    const span = document.createElement('span');
                    span.textContent = text;
                    meta.appendChild(span);
                };
                addMeta(item.subject || 'مادة تعليمية');
                addMeta('• ' + typeLabel(item.type));
                if (item.semester) addMeta('• الفصل ' + item.semester);
                if (item.corrected) addMeta('• مع التصحيح');
                link.appendChild(meta);
                options.appendChild(link);
            });

            const all = document.createElement('a');
            all.className = 'nadjah-search-all';
            all.href = searchPageUrl(query);
            all.textContent = 'عرض جميع النتائج';
            results.appendChild(all);
            openResults();
        };

        const runSearch = (query, retry = false) => {
            const currentRequest = ++requestId;
            if (!normalizeArabic(query)) {
                closeResults();
                return;
            }

            if (!retry && !state.data?.resources) {
                results.replaceChildren();
                const loading = document.createElement('div');
                loading.className = 'nadjah-search-empty nadjah-search-loading';
                loading.setAttribute('role', 'status');
                loading.textContent = 'جارٍ تحميل نتائج البحث…';
                results.appendChild(loading);
                openResults();
            }

            loadResources().then((data) => {
                if (currentRequest !== requestId || searchBox.value !== query) return;
                render(query, data?.resources);
            }).catch(() => {
                if (currentRequest !== requestId || searchBox.value !== query) return;
                showMessage('تعذر تحميل نتائج البحث. تحقق من الاتصال ثم أعد المحاولة.', { retry: true, query });
            });
        };

        const setActive = (index) => {
            if (!currentItems.length) return;
            activeIndex = (index + currentItems.length) % currentItems.length;
            results.querySelectorAll('.nadjah-search-item[role="option"]').forEach((item, itemIndex) => {
                const active = itemIndex === activeIndex;
                item.setAttribute('aria-selected', String(active));
                item.toggleAttribute('data-active', active);
            });
            searchBox.setAttribute('aria-activedescendant', `nadjah-search-option-${activeIndex}`);
            results.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' });
        };

        searchBox.addEventListener('input', (event) => runSearch(event.target.value));

        searchBox.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (results.classList.contains('active')) {
                    event.preventDefault();
                    closeResults();
                    searchBox.focus();
                }
                return;
            }

            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                if (!results.classList.contains('active') || !currentItems.length) return;
                event.preventDefault();
                const next = activeIndex < 0
                    ? (event.key === 'ArrowDown' ? 0 : currentItems.length - 1)
                    : activeIndex + (event.key === 'ArrowDown' ? 1 : -1);
                setActive(next);
                return;
            }

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
            }
        });

        document.addEventListener('click', (event) => {
            if (!container.contains(event.target)) closeResults();
        });

        state.dataReady?.then(() => {
            const query = searchBox.value.trim();
            if (query) runSearch(query);
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
        if (!nav) return;

        const isMobile = () => window.innerWidth <= 768;
        const current = new URL(window.location.href);

        const primary = [
            { label: 'الرئيسية', icon: 'fa-house', href: new URL('index.html', siteRootUrl).href },
            { label: 'البحث', icon: 'fa-magnifying-glass', href: new URL('pages/search.html', siteRootUrl).href },
            { label: 'الأطوار', icon: 'fa-layer-group', href: new URL('pages/levels.html', siteRootUrl).href },
            { label: 'المواد', icon: 'fa-book-open', href: new URL('pages/subjects.html', siteRootUrl).href }
        ];
        const secondary = [
            { label: 'الشعب الدراسية', icon: 'fa-graduation-cap', href: new URL('pages/branch.html', siteRootUrl).href },
            { label: 'مساحتي', icon: 'fa-bookmark', href: new URL('pages/my.html', siteRootUrl).href },
            { label: 'تواصل', icon: 'fa-envelope', href: new URL('pages/contact.html', siteRootUrl).href }
        ];

        const activeClass = (href) => {
            const normalizePath = (path) => path.replace(/\/index\.html$/, '/');
            return normalizePath(current.pathname) === normalizePath(new URL(href).pathname) ? ' active' : '';
        };

        let mobileBar = document.querySelector('.nadjah-mobile-nav');
        let moreSheet = document.querySelector('.nadjah-more-sheet');
        let backdrop = document.querySelector('.nadjah-more-backdrop');

        if (!mobileBar) {
            mobileBar = document.createElement('nav');
            mobileBar.className = 'nadjah-mobile-nav';
            mobileBar.setAttribute('aria-label', 'التنقل السريع');
            mobileBar.innerHTML = primary.map((item) => `
                <a href="${item.href}" class="mobile-nav-item${activeClass(item.href)}"${activeClass(item.href) ? ' aria-current="page"' : ''}>
                    <i class="fas ${item.icon}" aria-hidden="true"></i>
                    <span>${item.label}</span>
                </a>
            `).join('') + `
                <button type="button" class="mobile-nav-item mobile-nav-more" aria-expanded="false">
                    <i class="fas fa-ellipsis" aria-hidden="true"></i>
                    <span>المزيد</span>
                </button>
            `;
            document.body.appendChild(mobileBar);
        }

        if (!moreSheet) {
            moreSheet = document.createElement('div');
            moreSheet.className = 'nadjah-more-sheet';
            moreSheet.setAttribute('aria-hidden', 'true');
            moreSheet.setAttribute('role', 'dialog');
            moreSheet.setAttribute('aria-modal', 'true');
            moreSheet.setAttribute('aria-labelledby', 'nadjah-more-title');
            moreSheet.innerHTML = `
                <div class="nadjah-more-handle" aria-hidden="true"></div>
                <div class="nadjah-more-title" id="nadjah-more-title">المزيد</div>
                <div class="nadjah-more-links">
                    ${secondary.map((item) => `
                        <a href="${item.href}" class="${activeClass(item.href).trim()}"${activeClass(item.href) ? ' aria-current="page"' : ''}>
                            <i class="fas ${item.icon}" aria-hidden="true"></i>
                            <span>${item.label}</span>
                        </a>
                    `).join('')}
                </div>
            `;
            document.body.appendChild(moreSheet);
        }

        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'nadjah-more-backdrop';
            document.body.appendChild(backdrop);
        }

        const moreButton = mobileBar.querySelector('.mobile-nav-more');
        const setMoreOpen = (open) => {
            const wasOpen = moreSheet.classList.contains('active');
            moreSheet.classList.toggle('active', open);
            backdrop.classList.toggle('active', open);
            moreButton?.setAttribute('aria-expanded', String(open));
            moreSheet.setAttribute('aria-hidden', String(!open));
            if (open) {
                moreSheet.querySelector('a')?.focus();
            } else if (wasOpen && moreSheet.contains(document.activeElement)) {
                moreButton?.focus();
            }
        };

        moreButton?.addEventListener('click', () => {
            setMoreOpen(!moreSheet.classList.contains('active'));
        });
        backdrop.addEventListener('click', () => setMoreOpen(false));
        moreSheet.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMoreOpen(false)));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') setMoreOpen(false);
        });

        window.addEventListener('scroll', () => {
            if (moreSheet.classList.contains('active')) setMoreOpen(false);
        }, { passive: true });

        const syncMode = () => {
            const mobile = isMobile();
            mobileBar.hidden = !mobile;
            if (button) button.style.display = mobile ? 'none' : '';
            if (mobile) {
                nav.classList.remove('active');
                nav.setAttribute('aria-hidden', 'true');
            } else {
                nav.removeAttribute('aria-hidden');
                setMoreOpen(false);
            }
        };

        window.addEventListener('resize', syncMode, { passive: true });
        syncMode();
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
            let refreshing = false;
            let hadController = Boolean(navigator.serviceWorker.controller);

            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // The first controller takes over without reloading the page the user just opened.
                if (!hadController) {
                    hadController = true;
                    return;
                }
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
            });

            window.addEventListener('load', () => {
                const swUrl = new URL('../../service-worker.js', coreBaseUrl).href;
                navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' })
                    .then((registration) => {
                        registration.update().catch(() => {});

                        if (registration.waiting) {
                            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                        }

                        registration.addEventListener('updatefound', () => {
                            const worker = registration.installing;
                            if (!worker) return;
                            worker.addEventListener('statechange', () => {
                                if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                                    worker.postMessage({ type: 'SKIP_WAITING' });
                                }
                            });
                        });
                    })
                    .catch((error) => {
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

        // The offline fallback needs only the PWA lifecycle; avoid loading catalogs,
        // user state, search handlers, and animation features on this lightweight page.
        if (/\/offline\.html$/.test(window.location.pathname)) {
            initPwa();
            return;
        }

        ensureUxStyles();
        state.dataReady = loadCentralData();
        initLoader();
        initUserFeatures();
        initPwa();
        initLenisAndGsap();
        initStatistics();
        const pdfLibraryScript = document.createElement('script');
        pdfLibraryScript.src = new URL('pdf-library.js', coreBaseUrl).href;
        pdfLibraryScript.defer = true;
        pdfLibraryScript.dataset.pdfLibrary = 'true';
        document.head.appendChild(pdfLibraryScript);
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
        loadResources,
        loadStatistics,
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