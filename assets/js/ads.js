(() => {
    'use strict';

    const ADSENSE_CLIENT = 'ca-pub-5656416032906373';
    const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

    const AD_CONFIG = Object.freeze({
        display: [
            { slot: '3143411927', format: 'auto' },
            { slot: '1760836049', format: 'auto' },
            { slot: '5508509362', format: 'auto' }
        ],
        inFeed: [
            { slot: '7867079394', format: 'fluid', layoutKey: '-fr+56+4k-d4+74' },
            { slot: '8546947691', format: 'fluid', layoutKey: '-h9-h+8-jr+r8' },
            { slot: '6152718642', format: 'fluid', layoutKey: '-h6-l+d-jc+qd' }
        ],
        inArticle: [
            { slot: '6118497380', format: 'fluid', layout: 'in-article' },
            { slot: '7319898418', format: 'fluid', layout: 'in-article' }
        ],
        autoRelaxed: { slot: '6528123169', format: 'autorelaxed' }
    });

    const state = {
        initialized: false,
        scriptPromise: null,
        counters: { display: 0, inFeed: 0, inArticle: 0 }
    };

    function scheduleIdle(callback) {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(callback, { timeout: 1800 });
        } else {
            window.setTimeout(callback, 250);
        }
    }

    function loadAdSense() {
        if (state.scriptPromise) return state.scriptPromise;

        state.scriptPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src^="${ADSENSE_SRC}"]`);
            if (existing) {
                resolve(existing);
                return;
            }

            const script = document.createElement('script');
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.src = ADSENSE_SRC;
            script.addEventListener('load', () => resolve(script), { once: true });
            script.addEventListener('error', () => reject(new Error('تعذر تحميل Google AdSense')), { once: true });
            document.head.appendChild(script);
        });

        return state.scriptPromise;
    }

    function nextPlacement(type) {
        const placements = AD_CONFIG[type];
        const index = state.counters[type] % placements.length;
        state.counters[type] += 1;
        return placements[index];
    }

    function getPlacement(container, index) {
        const requestedType = container.dataset.adType;
        if (requestedType === 'in-article') return { type: 'inArticle', placement: nextPlacement('inArticle') };
        if (requestedType === 'autorelaxed') return { type: 'autoRelaxed', placement: AD_CONFIG.autoRelaxed };
        if (requestedType === 'display') return { type: 'display', placement: nextPlacement('display') };
        if (requestedType === 'in-feed') return { type: 'inFeed', placement: nextPlacement('inFeed') };

        if (container.classList.contains('ad-banner')) {
            return { type: 'display', placement: nextPlacement('display') };
        }

        // The first two contextual slots are kept close to the content; a final slot
        // becomes an unobtrusive recommendation unit on long "more" pages.
        if (container.closest('.article-content, .article-body, article') && index % 2 === 1) {
            return { type: 'inArticle', placement: nextPlacement('inArticle') };
        }

        return { type: 'inFeed', placement: nextPlacement('inFeed') };
    }

    function createAd(container, placement, type) {
        const ad = document.createElement('ins');
        ad.className = 'adsbygoogle';
        ad.setAttribute('data-ad-client', ADSENSE_CLIENT);
        ad.setAttribute('data-ad-slot', placement.slot);
        ad.setAttribute('data-ad-format', placement.format);
        ad.setAttribute('data-full-width-responsive', 'true');

        if (placement.layoutKey) ad.setAttribute('data-ad-layout-key', placement.layoutKey);
        if (placement.layout) ad.setAttribute('data-ad-layout', placement.layout);

        container.replaceChildren(ad);
        container.dataset.adReady = 'true';
        container.dataset.adResolvedType = type;
        container.classList.add(`ad-${type}`);
        container.setAttribute('aria-label', 'إعلان');

        return ad;
    }

    function renderAds() {
        const containers = [...document.querySelectorAll('.ad-slot, .ad-banner, [data-ad-slot]')]
            .filter(container => !container.dataset.adReady);

        containers.forEach((container, index) => {
            const { type, placement } = getPlacement(container, index);
            const ad = createAd(container, placement, type);

            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (error) {
                container.dataset.adError = 'true';
                container.classList.add('ad-failed');
                console.warn('تعذر تهيئة وحدة إعلانية:', error);
            }

            ad.addEventListener('error', () => {
                container.classList.add('ad-failed');
            }, { once: true });
        });

        state.initialized = true;
    }

    function init() {
        if (state.initialized || !document.querySelector('.ad-slot, .ad-banner, [data-ad-slot]')) return;

        document.documentElement.classList.add('ads-enabled');
        scheduleIdle(() => {
            loadAdSense()
                .then(renderAds)
                .catch(error => {
                    document.querySelectorAll('.ad-slot, .ad-banner').forEach(container => {
                        container.classList.add('ad-unavailable');
                    });
                    console.warn(error.message);
                });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
