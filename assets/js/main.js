// ========== LOADER ==========
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 900);
});

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

// Header scroll effect
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

// Dynamic statistics loaded from the generated data file.
function getStatsUrl() {
    const script = document.currentScript || [...document.scripts].find(item => /assets\/js\/main\.js$/.test(item.getAttribute('src') || '') || /\/assets\/js\/main\.js$/.test(item.src));
    return script ? new URL('../data/site-stats.json', script.src).href : new URL('assets/data/site-stats.json', document.baseURI).href;
}

function animateStatistics(stats) {
    const values = {
        resources: stats.resources,
        levels: stats.levels,
        subjects: stats.subjects,
        correctedResources: stats.correctedResources,
        correctionRate: stats.correctionRate
    };

    document.querySelectorAll('[data-stat-key]').forEach(element => {
        const target = Number(values[element.dataset.statKey]);
        if (!Number.isFinite(target)) return;
        gsap.to(element, {
            innerHTML: target,
            duration: 1.6,
            snap: { innerHTML: 1 },
            ease: 'power2.out',
            scrollTrigger: {
                trigger: element,
                start: 'top 80%'
            }
        });
    });
}

fetch(getStatsUrl())
    .then(response => {
        if (!response.ok) throw new Error(`Statistics request failed: ${response.status}`);
        return response.json();
    })
    .then(animateStatistics)
    .catch(error => console.warn('تعذر تحميل إحصائيات الموقع الديناميكية:', error));

// ========== CUSTOM CURSOR ==========
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');
let mouseX = 0,
    mouseY = 0;
let cursorX = 0,
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

// Hover effect
const interactiveElements = document.querySelectorAll('a, button, .level-card, .subject-card, .resource-card, .year-btn, .download-btn');
interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

// ========== STARFIELD CANVAS ==========
const starCanvas = document.getElementById('starfield');
const starCtx = starCanvas.getContext('2d');
let stars = [];
const starCount = 200;
let mouseStarX = 0,
    mouseStarY = 0;

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

        if (this.x < 0 || this.x > starCanvas.width || this.y < 0 || this.y > starCanvas.height) {
            this.reset();
        }
    }
    draw() {
        const alpha = this.opacity * (0.5 + this.brightness * 0.5);
        starCtx.beginPath();
        starCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        starCtx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
        starCtx.fill();
    }
}

for (let i = 0; i < starCount; i++) {
    stars.push(new Star());
}

document.addEventListener('mousemove', (e) => {
    mouseStarX = e.clientX;
    mouseStarY = e.clientY;
});

function drawConnections() {
    for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
            const dx = stars[i].x - stars[j].x;
            const dy = stars[i].y - stars[j].y;
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

        // Connect to mouse
        const dx = stars[i].x - mouseStarX;
        const dy = stars[i].y - mouseStarY;
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

// ========== THREE.JS SHADER SPHERE ==========
const shaderCanvas = document.getElementById('shader-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: shaderCanvas,
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    void main() {
        vUv = uv;
        vPosition = position;
        vec3 pos = position;
        float noise = sin(pos.x * 3.0 + uTime) * cos(pos.y * 3.0 + uTime) * 0.1;
        pos += normal * noise;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
        float n = noise(vUv * 5.0 + uTime * 0.2);
        float n2 = noise(vUv * 10.0 - uTime * 0.3);
        vec3 color = mix(uColor1, uColor2, n + n2 * 0.5);
        float alpha = 0.15 + n * 0.1;
        gl_FragColor = vec4(color, alpha);
    }
`;

const geometry = new THREE.SphereGeometry(3, 64, 64);
const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        uTime: {
            value: 0
        },
        uColor1: {
            value: new THREE.Color('#d4af37')
        },
        uColor2: {
            value: new THREE.Color('#0f172a')
        }
    },
    transparent: true,
    side: THREE.DoubleSide,
    wireframe: true
});

const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);
camera.position.z = 5;

let shaderTime = 0;

function animateShader() {
    shaderTime += 0.01;
    material.uniforms.uTime.value = shaderTime;
    sphere.rotation.x += 0.002;
    sphere.rotation.y += 0.003;
    renderer.render(scene, camera);
    requestAnimationFrame(animateShader);
}
animateShader();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ========== SMOOTH ANCHOR SCROLLING ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            lenis.scrollTo(target, {
                offset: -80
            });
        }
    });
});

// ========== SEARCH FUNCTIONALITY ==========
const searchBox = document.querySelector('.search-box');
searchBox.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.subject-card, .resource-card, .level-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.opacity = text.includes(query) || query === '' ? '1' : '0.3';
        card.style.transform = text.includes(query) || query === '' ? '' : 'scale(0.95)';
    });
});

// ========== PARALLAX EFFECTS ==========
gsap.to('.hero-content', {
    yPercent: 30,
    ease: 'none',
    scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true
    }
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

// ======== nav-links==============
const menuBtn = document.querySelector('.mobile-toggle');
const navLinks = document.querySelector('.nav-links');

menuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});
