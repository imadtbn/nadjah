(() => {
    'use strict';

    if (window.NadjahCore?.initialized) return;

    const currentScript = document.currentScript;
    const coreBaseUrl = currentScript?.src ? new URL('.', currentScript.src) : new URL('assets/js/', document.baseURI);

    const state = {
        initialized: false,
        lenis: null
    };

    const safeQuery = (selector) => document.querySelector(selector);

    function initLoader() {
        window.addEventListener('load', () => {
            const loader = document.getElementById('loader');
            if (!loader) return;
            setTimeout(() => loader.classList.add('hidden'), 900);
        });
    }

    function initLenisAndGsap() {
        if (!window.Lenis || !window.gsap || !window.ScrollTrigger) return;

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smooth: true
        });
        state.lenis = lenis;

        gsap.registerPlugin(ScrollTrigger);
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
        const starCount = window.matchMedia('(max-width: 768px)').matches ? 90 : 160;
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
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) drawConnections();
            requestAnimationFrame(animate);
        };
        animate();
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

    function initSearch() {
        const searchBox = safeQuery('.search-box');
        if (!searchBox) return;

        searchBox.addEventListener('input', (event) => {
            const query = event.target.value.trim().toLowerCase();
            const docCards = document.querySelectorAll('.doc-card');
            const visualCards = document.querySelectorAll('.subject-card, .resource-card, .level-card');

            if (docCards.length) {
                docCards.forEach((card) => {
                    card.style.display = !query || card.textContent.toLowerCase().includes(query) ? 'flex' : 'none';
                });
                return;
            }

            visualCards.forEach((card) => {
                const match = !query || card.textContent.toLowerCase().includes(query);
                card.style.opacity = match ? '1' : '0.3';
                card.style.transform = match ? '' : 'scale(0.95)';
            });
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

    function init() {
        if (state.initialized) return;
        state.initialized = true;
        initLoader();
        initLenisAndGsap();
        initStatistics();
        initCustomCursor();
        initStarfield();
        initSmoothAnchors();
        initSearch();
        initMobileMenu();
        initScrollTop();
    }

    window.NadjahCore = {
        initialized: true,
        state,
        init,
        get lenis() { return state.lenis; }
    };

    init();
})();