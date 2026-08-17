
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

ScrollTrigger.create({
    start: 'top -100',
    end: 99999,
    toggleClass: {
        className: 'scrolled',
        targets: '.header'
    }
});

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

// Subject statistics are calculated from the document cards on this page.
function updateSubjectStatistics() {
    const cards = [...document.querySelectorAll('.doc-card')];
    const corrected = cards.filter(card => card.querySelector('.solution-badge.with-solution')).length;
    const values = {
        resources: cards.length,
        correctionRate: cards.length ? Math.round((corrected / cards.length) * 100) : 0
    };

    document.querySelectorAll('[data-subject-stat]').forEach(element => {
        const value = values[element.dataset.subjectStat];
        if (value === undefined) return;
        element.textContent = value;
    });
}

updateSubjectStatistics();

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
document.querySelectorAll('a, button, .doc-card, .doc-download-btn, .doc-filter, .semester-tab').forEach(el => {
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
    document.querySelectorAll('.semester-content').forEach(content => content.classList.remove('active'));
    document.getElementById('semester-' + num).classList.add('active');
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

// ========== DOCUMENT FILTERS ==========
function filterDocs(type) {
    document.querySelectorAll('.doc-filter').forEach(f => f.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.semester-content.active .doc-card').forEach(card => {
        if (type === 'all' || card.dataset.type === type) {
            card.style.display = 'flex';
            gsap.fromTo(card, {
                opacity: 0,
                y: 20
            }, {
                opacity: 1,
                y: 0,
                duration: 0.4,
                ease: 'power3.out'
            });
        } else {
            card.style.display = 'none';
        }
    });
}

// ========== DOWNLOAD SIMULATION ==========
function downloadDoc(btn) {
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
    btn.style.background = 'var(--gold)';
    btn.style.color = 'var(--void)';
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-check"></i> تم التحميل!';
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
    }, 1500);
}

// ========== SEARCH ==========
document.querySelector('.search-box').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.doc-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) || query === '' ? 'flex' : 'none';
    });
});


// ========== المعاينة والطباعة ==========
function previewPDF(url) {

    document.getElementById("pdfViewer").src = url;

    document.getElementById("pdfModal")
        .classList.add("active");
}

function closePDFPreview() {

    document.getElementById("pdfModal")
        .classList.remove("active");

    document.getElementById("pdfViewer").src = "";
}

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