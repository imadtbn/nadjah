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
    // تأثير Three.js خاص بالصفحات التي تحتوي على shader-canvas فقط.
    const shaderCanvas = document.getElementById('shader-canvas');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobileLike = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;

    if (shaderCanvas && window.THREE && !reduceMotion && !mobileLike) {
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
            uniform float uTime;
            void main() {
                vUv = uv;
                vec3 pos = position;
                float wave = sin(pos.x * 3.0 + uTime) * cos(pos.y * 3.0 + uTime) * 0.1;
                pos += normal * wave;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        const fragmentShader = `
            varying vec2 vUv;
            uniform float uTime;
            uniform vec3 uColor1;
            uniform vec3 uColor2;

            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }

            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }

            void main() {
                float n = noise(vUv * 5.0 + uTime * 0.2);
                float n2 = noise(vUv * 10.0 - uTime * 0.3);
                vec3 color = mix(uColor1, uColor2, n + n2 * 0.5);
                gl_FragColor = vec4(color, 0.15 + n * 0.1);
            }
        `;

        const geometry = new THREE.SphereGeometry(3, 36, 36);
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uColor1: { value: new THREE.Color('#d4af37') },
                uColor2: { value: new THREE.Color('#0f172a') }
            },
            transparent: true,
            side: THREE.DoubleSide,
            wireframe: true
        });

        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        camera.position.z = 5;

        let shaderTime = 0;
        const render = () => {
            shaderTime += 0.01;
            material.uniforms.uTime.value = shaderTime;
            sphere.rotation.x += 0.002;
            sphere.rotation.y += 0.003;
            renderer.render(scene, camera);
            if (!document.hidden) requestAnimationFrame(render);
        };
        render();

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) requestAnimationFrame(render);
        });

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }, { passive: true });
    }

    if (window.gsap && !reduceMotion && !mobileLike && document.querySelector('.hero-content') && document.querySelector('.hero')) {
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
    }
}).catch((error) => console.error('تعذر تحميل وظائف منصة النجاح المشتركة:', error));
