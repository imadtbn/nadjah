(() => {
  'use strict';

  if (window.NadjahUser) return;

  const KEY = 'nadjah:user:v1';
  const MAX_RECENT = 30;
  let volatileState = blank();
  let volatileMode = false;

  function blank() {
    return {
      favorites: [],
      recent: [],
      views: {},
      downloads: {},
      preferences: {
        cycleId: '',
        levelLabel: '',
        subject: '',
        semester: ''
      }
    };
  }

  function cleanIds(value, limit = Infinity) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id) => typeof id === 'string' && id.trim()))].slice(0, limit);
  }

  function cleanCounts(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value)
        .filter(([id, count]) => id && Number.isFinite(Number(count)) && Number(count) > 0)
        .map(([id, count]) => [id, Math.floor(Number(count))])
    );
  }

  function normalizeState(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const base = blank();
    const preferences = source.preferences && typeof source.preferences === 'object'
      ? source.preferences
      : {};
    return {
      favorites: cleanIds(source.favorites),
      recent: cleanIds(source.recent, MAX_RECENT),
      views: cleanCounts(source.views),
      downloads: cleanCounts(source.downloads),
      preferences: {
        cycleId: typeof preferences.cycleId === 'string' ? preferences.cycleId : base.preferences.cycleId,
        levelLabel: typeof preferences.levelLabel === 'string' ? preferences.levelLabel : base.preferences.levelLabel,
        subject: typeof preferences.subject === 'string' ? preferences.subject : base.preferences.subject,
        semester: typeof preferences.semester === 'string' || typeof preferences.semester === 'number'
          ? String(preferences.semester)
          : base.preferences.semester
      }
    };
  }

  function load() {
    if (volatileMode) return normalizeState(volatileState);
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? normalizeState(JSON.parse(raw)) : blank();
    } catch {
      volatileMode = true;
      return normalizeState(volatileState);
    }
  }

  function publish(state) {
    document.dispatchEvent(new CustomEvent('nadjah:user-state', { detail: state }));
  }

  function save(state) {
    const normalized = normalizeState(state);
    volatileState = normalized;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(normalized));
      volatileMode = false;
    } catch {
      volatileMode = true;
    }
    publish(normalized);
    return normalized;
  }

  function reset() {
    volatileState = blank();
    try {
      window.localStorage.removeItem(KEY);
      volatileMode = false;
    } catch {
      volatileMode = true;
    }
    publish(normalizeState(volatileState));
    return normalizeState(volatileState);
  }

  function clearRecent() {
    const state = load();
    state.recent = [];
    return save(state);
  }

  function clearMetrics() {
    const state = load();
    state.views = {};
    state.downloads = {};
    return save(state);
  }

  function touchRecent(id) {
    if (!id) return;
    const state = load();
    state.recent = [id, ...(state.recent || []).filter((x) => x !== id)].slice(0, MAX_RECENT);
    state.views[id] = (Number(state.views[id]) || 0) + 1;
    save(state);
  }

  function toggleFavorite(id) {
    if (!id) return false;
    const state = load();
    const set = new Set(state.favorites || []);
    set.has(id) ? set.delete(id) : set.add(id);
    state.favorites = [...set];
    save(state);
    return set.has(id);
  }

  function isFavorite(id) {
    return (load().favorites || []).includes(id);
  }

  function trackDownload(id) {
    if (!id) return;
    const state = load();
    state.downloads[id] = (Number(state.downloads[id]) || 0) + 1;
    save(state);
  }

  function setPreferences(next) {
    const state = load();
    state.preferences = { ...state.preferences, ...(next || {}) };
    save(state);
    return state.preferences;
  }

  function getPreferences() {
    return load().preferences;
  }

  function isPersistent() {
    if (volatileMode) return false;
    try {
      window.localStorage.getItem(KEY);
      return true;
    } catch {
      volatileMode = true;
      return false;
    }
  }

  function topIds(map, limit = 10) {
    return Object.entries(map || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, limit)
      .map(([id]) => id);
  }

  function scoreRecommendation(item, state, resourceMap) {
    let score = 0;
    const pref = state.preferences || {};

    if (pref.cycleId && item.cycleId === pref.cycleId) score += 5;
    if (pref.levelLabel && item.levelLabel === pref.levelLabel) score += 5;
    if (pref.subject && item.subject === pref.subject) score += 7;
    if (pref.semester && String(item.semester || '') === String(pref.semester)) score += 3;

    for (const recentId of (state.recent || []).slice(0, 10)) {
      const recent = resourceMap.get(recentId);
      if (!recent) continue;
      if (recent.subject && recent.subject === item.subject) score += 2.5;
      if (recent.cycleId && recent.cycleId === item.cycleId) score += 1;
      if (recent.levelLabel && recent.levelLabel === item.levelLabel) score += 1.5;
      if (recent.branch && recent.branch === item.branch) score += 1.5;
    }

    if (item.corrected) score += .35;
    score += Math.min(Number(state.views?.[item.id]) || 0, 5) * .15;
    return score;
  }

  function recommendations(resources, limit = 12) {
    const state = load();
    const map = new Map((resources || []).map((item) => [item.id, item]));
    const excluded = new Set((state.recent || []).slice(0, 4));
    return (resources || [])
      .filter((item) => !excluded.has(item.id))
      .map((item) => ({ item, score: scoreRecommendation(item, state, map) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.item);
  }

  async function shareResource(item) {
    if (!item?.id) return false;
    const url = window.NadjahCore?.resourceUrl
      ? window.NadjahCore.resourceUrl(item.id)
      : window.location.href;
    const payload = { title: item.title || 'منصة النجاح', text: item.title || 'مورد تعليمي', url };

    if (navigator.share) {
      try {
        await navigator.share(payload);
        return 'shared';
      } catch (error) {
        if (error?.name === 'AbortError') return false;
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return 'copied';
      }
    } catch {
      // Try the compatible text-selection fallback below.
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied ? 'copied' : false;
    } catch {
      return false;
    }
  }

  function enhanceLegacyCards(root = document) {
    const cards = [];
    if (root.matches?.('.doc-card[data-resource-id]')) cards.push(root);
    root.querySelectorAll?.('.doc-card[data-resource-id]').forEach((card) => cards.push(card));

    cards.forEach((card) => {
      const id = card.dataset.resourceId;
      if (!id) return;

      let buttons = card.querySelector('.doc-buttons, .doc-actions');
      if (!buttons) {
        buttons = document.createElement('div');
        buttons.className = 'doc-buttons';
        card.appendChild(buttons);
      } else {
        buttons.classList.add('doc-buttons');
      }

      card.querySelectorAll('a[href]').forEach((link) => {
        const text = (link.textContent || '').trim();
        if (link.classList.contains('resource-detail-link') || /صفحة النموذج|التفاصيل/.test(text)) {
          link.classList.add('doc-action-detail');
        } else if (link.classList.contains('doc-preview-btn') || /معاينة|عرض/.test(text)) {
          link.classList.add('doc-action-preview');
        } else if (link.classList.contains('doc-download-btn') || /تحميل|PDF/.test(text)) {
          link.classList.add('doc-action-download');
        }
      });

      card.querySelectorAll('a.doc-action-download[href], a.doc-download-btn[href]').forEach((link) => {
        if (link.classList.contains('resource-detail-link') || link.dataset.downloadTracked) return;
        link.addEventListener('click', () => trackDownload(id));
        link.dataset.downloadTracked = 'true';
      });

      let favorite = buttons.querySelector('.quick-favorite-action');
      if (!favorite) {
        favorite = document.createElement('button');
        favorite.type = 'button';
        favorite.className = 'doc-download-btn quick-favorite-action doc-action-favorite';
        buttons.appendChild(favorite);
      }

      const refresh = () => {
        const active = isFavorite(id);
        favorite.classList.toggle('active', active);
        favorite.innerHTML = active
          ? '<i class="fas fa-heart" aria-hidden="true"></i><span>محفوظ</span>'
          : '<i class="far fa-heart" aria-hidden="true"></i><span>مفضلة</span>';
        favorite.setAttribute('aria-pressed', String(active));
        favorite.setAttribute('aria-label', active ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة');
      };
      refresh();

      if (!favorite.dataset.bound) {
        favorite.addEventListener('click', () => toggleFavorite(id));
        favorite.dataset.bound = 'true';
      }

      if (!favorite.dataset.refreshBound) {
        document.addEventListener('nadjah:user-state', refresh);
        favorite.dataset.refreshBound = 'true';
      }

      const ordered = [
        ...buttons.querySelectorAll('.doc-action-detail, .resource-detail-link'),
        ...buttons.querySelectorAll('.doc-action-preview, .doc-preview-btn'),
        ...buttons.querySelectorAll('.doc-action-download'),
        favorite
      ];

      const seen = new Set();
      ordered.forEach((element) => {
        if (!element || seen.has(element)) return;
        seen.add(element);
        buttons.appendChild(element);
      });

      buttons.querySelectorAll(':scope > *').forEach((element) => {
        if (!seen.has(element)) buttons.appendChild(element);
      });
    });
  }

  function observeDynamicCards() {
    if (!document.body || document.body.dataset.nadjahFavoritesObserver) return;
    document.body.dataset.nadjahFavoritesObserver = 'true';

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (
            node.matches('.doc-card[data-resource-id]') ||
            node.querySelector('.doc-card[data-resource-id]')
          ) {
            enhanceLegacyCards(node);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function initResourcePage() {
    enhanceLegacyCards();
    observeDynamicCards();

    const main = document.querySelector('main[data-resource-id]');
    if (!main) return;
    const id = main.dataset.resourceId;
    touchRecent(id);

    const actions = document.querySelector('.resource-actions');
    if (!actions) return;

    const favorite = document.createElement('button');
    favorite.type = 'button';
    favorite.className = 'resource-action user-action favorite-action';
    favorite.dataset.resourceId = id;

    const updateFav = () => {
      const active = isFavorite(id);
      favorite.classList.toggle('active', active);
      favorite.innerHTML = active
        ? '<i class="fas fa-heart" aria-hidden="true"></i> محفوظ في المفضلة'
        : '<i class="far fa-heart" aria-hidden="true"></i> إضافة للمفضلة';
      favorite.setAttribute('aria-pressed', String(active));
    };
    updateFav();

    favorite.addEventListener('click', () => toggleFavorite(id));
    document.addEventListener('nadjah:user-state', updateFav);

    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'resource-action user-action';
    share.innerHTML = '<i class="fas fa-share-nodes" aria-hidden="true"></i> مشاركة';
    share.addEventListener('click', async () => {
      const item = window.NadjahCore?.findResource?.(id);
      if (!item) {
        share.textContent = 'تعذر تحميل بيانات النموذج';
        return;
      }
      const result = await shareResource(item);
      if (result === 'shared') {
        share.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> تمت المشاركة';
      } else if (result === 'copied') {
        share.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> تم نسخ الرابط';
      } else {
        share.innerHTML = '<i class="fas fa-share-nodes" aria-hidden="true"></i> مشاركة';
        return;
      }
      window.setTimeout(() => {
        share.innerHTML = '<i class="fas fa-share-nodes" aria-hidden="true"></i> مشاركة';
      }, 1800);
    });

    actions.append(favorite, share);

    document.querySelectorAll('.resource-action.primary[href], a.doc-download-btn[href]').forEach((link) => {
      if (link.dataset.downloadTracked) return;
      link.addEventListener('click', () => trackDownload(id));
      link.dataset.downloadTracked = 'true';
    });
  }

  window.NadjahUser = {
    load,
    save,
    reset,
    clearRecent,
    clearMetrics,
    toggleFavorite,
    isFavorite,
    trackDownload,
    touchRecent,
    setPreferences,
    getPreferences,
    recommendations,
    topViewed(limit = 10) { const state = load(); return topIds(state.views, limit); },
    topDownloaded(limit = 10) { const state = load(); return topIds(state.downloads, limit); },
    shareResource,
    isPersistent
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResourcePage, { once: true });
  } else {
    initResourcePage();
  }
})();
