(() => {
  'use strict';

  if (window.__siteTagsLoaded) return;
  window.__siteTagsLoaded = true;

  const config = Object.freeze({
    gtmId: 'GTM-5FW5WZZ4',
    ga4MeasurementId: 'G-67JEETTJD7', // معرف GA4 المؤكد من المستخدم؛ يُحمّل مركزيًا عبر gtag.js.
    adsenseClient: 'ca-pub-5656416032906373',
    clarityId: 'xxxxxxxx', // ضع هنا معرف Microsoft Clarity إذا توفر.
  });

  const state = {
    gtm: false,
    ga4: false,
    adsense: false,
    clarity: false,
  };

  window.__siteTagsConfig = config;
  window.__siteTagsState = state;

  const isConfigured = (value) => Boolean(value) && !/^x+$/i.test(value);

  const findScript = (src) => Array.from(document.scripts).find((script) => (
    script.dataset.siteTagSrc === src || script.src === src
  ));

  const loadScript = (src, { crossOrigin = false } = {}) => new Promise((resolve, reject) => {
    const existing = findScript(src);
    if (existing) {
      if (existing.dataset.siteTagLoaded === 'true') {
        resolve(existing);
        return;
      }
      existing.addEventListener('load', () => resolve(existing), { once: true });
      existing.addEventListener('error', () => reject(new Error(`تعذر تحميل: ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.siteTagSrc = src;
    if (crossOrigin) script.crossOrigin = 'anonymous';

    script.addEventListener('load', () => {
      script.dataset.siteTagLoaded = 'true';
      resolve(script);
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`تعذر تحميل: ${src}`)), { once: true });
    document.head.appendChild(script);
  });

  const runWhenIdle = (callback, timeout) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout });
    } else {
      window.setTimeout(callback, timeout);
    }
  };

  const loadGtm = () => {
    if (!isConfigured(config.gtmId) || state.gtm) return;

    window.dataLayer = window.dataLayer || [];
    if (!window.dataLayer.some((entry) => entry && entry.event === 'gtm.js')) {
      window.dataLayer.push({
        'gtm.start': Date.now(),
        event: 'gtm.js',
      });
    }

    state.gtm = true;
    const src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmId)}`;
    loadScript(src).catch((error) => console.warn(error.message));
  };

  const loadGa4 = () => {
    if (!isConfigured(config.ga4MeasurementId) || state.ga4) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtagQueue(...args) {
      window.dataLayer.push(args);
    };

    const hasJsCommand = window.dataLayer.some((entry) => Array.isArray(entry) && entry[0] === 'js');
    const hasConfigCommand = window.dataLayer.some((entry) => (
      Array.isArray(entry) && entry[0] === 'config' && entry[1] === config.ga4MeasurementId
    ));
    if (!hasJsCommand) window.gtag('js', new Date());
    if (!hasConfigCommand) window.gtag('config', config.ga4MeasurementId);

    state.ga4 = true;
    const src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4MeasurementId)}`;
    loadScript(src).catch((error) => {
      state.ga4 = false;
      console.warn(error.message);
    });
  };

  const queueAds = () => {
    window.adsbygoogle = window.adsbygoogle || [];
    document.querySelectorAll('ins.adsbygoogle').forEach((unit) => {
      if (unit.hasAttribute('data-adsbygoogle-status') || unit.hasAttribute('data-site-tag-queued')) return;
      unit.setAttribute('data-site-tag-queued', 'true');
      try {
        window.adsbygoogle.push({});
      } catch (error) {
        unit.removeAttribute('data-site-tag-queued');
        console.warn('تعذر تهيئة وحدة AdSense:', error);
      }
    });
  };

  const loadAdsense = () => {
    if (!isConfigured(config.adsenseClient) || state.adsense) return;
    if (!document.querySelector('ins.adsbygoogle')) return;

    state.adsense = true;
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.adsenseClient)}`;
    loadScript(src, { crossOrigin: true })
      .then(queueAds)
      .catch((error) => {
        state.adsense = false;
        console.warn(error.message);
      });
  };

  const loadClarity = () => {
    if (!isConfigured(config.clarityId) || state.clarity) return;

    state.clarity = true;
    window.clarity = window.clarity || function clarityQueue(...args) {
      (window.clarity.q = window.clarity.q || []).push(args);
    };

    const src = `https://www.clarity.ms/tag/${encodeURIComponent(config.clarityId)}`;
    loadScript(src).catch((error) => {
      state.clarity = false;
      console.warn(error.message);
    });
  };

  loadGtm();
  loadGa4();

  window.addEventListener('load', () => {
    runWhenIdle(loadAdsense, 4000);
    runWhenIdle(loadClarity, 6000);
  }, { once: true, passive: true });
})();
