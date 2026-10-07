

// ========== LENIS SMOOTH SCROLL ==========
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// ========== GSAP SCROLL TRIGGER ==========
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Header scroll
ScrollTrigger.create({
    start: 'top -100',
    end: 99999,
    toggleClass: {
        className: 'scrolled',
        targets: '.header'
    }
});

// Reveal animations
const reveals = document.querySelectorAll('.reveal');
reveals.forEach(el => {
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

// ========== GLOBAL SITE STATISTICS ==========
function getRevealStatsUrl() {
    const script = document.currentScript || [...document.scripts].find(item =>
        /assets\/js\/reveal\.js(?:\?|$)/.test(item.getAttribute('src') || '') ||
        /\/assets\/js\/reveal\.js(?:\?|$)/.test(item.src || '')
    );
    return script
        ? new URL('../data/site-stats.json', script.src).href
        : new URL('assets/data/site-stats.json', document.baseURI).href;
}

fetch(getRevealStatsUrl(), { cache: 'no-store' })
    .then(response => {
        if (!response.ok) throw new Error(`Statistics request failed: ${response.status}`);
        return response.json();
    })
    .then(stats => {
        const values = {
            resources: stats.resources,
            levels: stats.levels,
            subjects: stats.subjects,
            correctedResources: stats.correctedResources,
            correctionRate: stats.correctionRate
        };
        document.querySelectorAll('[data-stat-key]').forEach(element => {
            const value = Number(values[element.dataset.statKey]);
            if (Number.isFinite(value)) element.textContent = String(value);
        });
    })
    .catch(error => console.warn('تعذر تحميل إحصائيات الموقع الديناميكية:', error));

// إحصائيات صفحة السنة تُستخرج من أعداد النماذج المعلنة في بطاقات المواد.
document.querySelectorAll('[data-subject-stat="resources"]').forEach(element => {
    const total = [...document.querySelectorAll('.subject-count')]
        .reduce((sum, item) => {
            const match = item.textContent.match(/\d+/);
            return sum + (match ? Number(match[0]) : 0);
        }, 0);
    if (total > 0) {
        const small = element.querySelector('small');
        element.textContent = String(total) + ' ';
        if (small) element.appendChild(small);
        else element.insertAdjacentHTML('beforeend', '<small>نموذج</small>');
    }
});

// ========== CUSTOM CURSOR ==========
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');
let mouseX = 0,
    mouseY = 0,
    cursorX = 0,
    cursorY = 0;
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top = mouseY + 'px';
});

function animateCursor() {
    cursorX += (mouseX - cursorX) * 0.1;
    cursorY += (mouseY - cursorY) * 0.1;
    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';
    requestAnimationFrame(animateCursor);
}
animateCursor();
document.querySelectorAll('a, button, .subject-card, .semester-tab').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

// ========== STARFIELD CANVAS ==========
const starCanvas = document.getElementById('starfield');
const starCtx = starCanvas.getContext('2d');
let stars = [];
const starCount = 200;

function resizeStarCanvas() {
    starCanvas.width = window.innerWidth;
    starCanvas.height = window.innerHeight;
}
resizeStarCanvas();
window.addEventListener('resize', resizeStarCanvas);
class Star {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * starCanvas.width;
        this.y = Math.random() * starCanvas.height;
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
        if (this.x < 0 || this.x > starCanvas.width || this.y < 0 || this.y > starCanvas.height) this.reset();
    }
    draw() {
        const alpha = this.opacity * (0.5 + this.brightness * 0.5);
        starCtx.beginPath();
        starCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        starCtx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
        starCtx.fill();
    }
}
for (let i = 0; i < starCount; i++) stars.push(new Star());
let mouseStarX = 0,
    mouseStarY = 0;
document.addEventListener('mousemove', (e) => {
    mouseStarX = e.clientX;
    mouseStarY = e.clientY;
});

function drawConnections() {
    for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
            const dx = stars[i].x - stars[j].x,
                dy = stars[i].y - stars[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                const alpha = (1 - dist / 100) * 0.15;
                starCtx.beginPath();
                starCtx.moveTo(stars[i].x, stars[i].y);
                starCtx.lineTo(stars[j].x, stars[j].y);
                starCtx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
                starCtx.lineWidth = 0.5;
                starCtx.stroke();
            }
        }
        const dx = stars[i].x - mouseStarX,
            dy = stars[i].y - mouseStarY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.3;
            starCtx.beginPath();
            starCtx.moveTo(stars[i].x, stars[i].y);
            starCtx.lineTo(mouseStarX, mouseStarY);
            starCtx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
            starCtx.lineWidth = 0.8;
            starCtx.stroke();
        }
    }
}

function animateStars() {
    starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
    stars.forEach(star => {
        star.update();
        star.draw();
    });
    drawConnections();
    requestAnimationFrame(animateStars);
}
animateStars();

// ========== SEMESTER TABS ==========
function switchSemester(num) {
    document.querySelectorAll('.semester-tab').forEach(tab => {
        tab.classList.remove('active');
        if (parseInt(tab.dataset.semester) === num) tab.classList.add('active');
    });
    document.querySelectorAll('.semester-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('semester-' + num).classList.add('active');

    // Re-trigger animations for new content
    const newContent = document.getElementById('semester-' + num);
    newContent.querySelectorAll('.reveal').forEach(el => {
        gsap.fromTo(el, {
            opacity: 0,
            y: 30
        }, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
            stagger: 0.1
        });
    });
}

// ========== SEARCH ==========
const searchBox = document.querySelector('.search-box');
if (searchBox) searchBox.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.subject-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.opacity = text.includes(query) || query === '' ? '1' : '0.3';
        card.style.transform = text.includes(query) || query === '' ? '' : 'scale(0.95)';
    });
});

// ========== SMOOTH ANCHOR SCROLLING ==========
document.querySelectorAll('a[href^="education_platform"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        if (this.getAttribute('href').startsWith('education_platform.html#')) {
            e.preventDefault();
            const targetId = this.getAttribute('href').split('#')[1];
            const target = document.getElementById(targetId);
            if (target) lenis.scrollTo(target, {
                offset: -80
            });
        }
    });
});

// ======== nav-links==============
const menuBtn = document.querySelector('.mobile-toggle');
const navLinks = document.querySelector('.nav-links');

menuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// ========== زر الرجوع للأعلى ==========

const scrollTopBtn = document.getElementById("scrollTopBtn");

window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
        scrollTopBtn.classList.add("show");
    } else {
        scrollTopBtn.classList.remove("show");
    }
});

scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});