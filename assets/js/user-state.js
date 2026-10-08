(() => {
  'use strict';

  if (window.NadjahUser) return;

  const KEY = 'nadjah:user:v1';
  const MAX_RECENT = 30;

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

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
      return Object.assign(blank(), parsed || {});
    } catch {
      return blank();
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
    document.dispatchEvent(new CustomEvent('nadjah:user-state', { detail: state }));
    return state;
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
    state.preferences = { ...state.preferences, ...next };
    save(state);
    return state.preferences;
  }

  function getPreferences() {
    return load().preferences;
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
    const url = window.NadjahCore?.resourceUrl ? window.NadjahCore.resourceUrl(item.id) : location.href;
    const payload = { title: item.title, text: item.title, url };
    if (navigator.share) {
      try { await navigator.share(payload); return true; } catch (e) {
        if (e?.name === 'AbortError') return false;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }

  function enhanceLegacyCards() {
    document.querySelectorAll('.doc-card[data-resource-id]').forEach((card) => {
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
        if (link.classList.contains('resource-detail-link')) return;
        link.addEventListener('click', () => trackDownload(id), { once: true });
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
          ? '<i class="fas fa-heart"></i><span>محفوظ</span>'
          : '<i class="far fa-heart"></i><span>مفضلة</span>';
        favorite.setAttribute('aria-pressed', String(active));
        favorite.setAttribute('aria-label', active ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة');
      };
      refresh();

      if (!favorite.dataset.bound) {
        favorite.addEventListener('click', () => {
          toggleFavorite(id);
          refresh();
        });
        favorite.dataset.bound = 'true';
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
  function initResourcePage() {
    enhanceLegacyCards();

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
        ? '<i class="fas fa-heart"></i> محفوظ في المفضلة'
        : '<i class="far fa-heart"></i> إضافة للمفضلة';
      favorite.setAttribute('aria-pressed', String(active));
    };
    updateFav();

    favorite.addEventListener('click', () => {
      toggleFavorite(id);
      updateFav();
    });

    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'resource-action user-action';
    share.innerHTML = '<i class="fas fa-share-nodes"></i> مشاركة';
    share.addEventListener('click', async () => {
      const item = window.NadjahCore?.findResource?.(id);
      if (!item) return;
      const ok = await shareResource(item);
      if (ok && !navigator.share) {
        share.innerHTML = '<i class="fas fa-check"></i> تم نسخ الرابط';
        setTimeout(() => { share.innerHTML = '<i class="fas fa-share-nodes"></i> مشاركة'; }, 1600);
      }
    });

    actions.append(favorite, share);

    document.querySelectorAll('.resource-action.primary[href], a.doc-download-btn[href]').forEach((link) => {
      link.addEventListener('click', () => trackDownload(id), { once: true });
    });
  }

  window.NadjahUser = {
    load,
    save,
    toggleFavorite,
    isFavorite,
    trackDownload,
    touchRecent,
    setPreferences,
    getPreferences,
    recommendations,
    topViewed(limit = 10) { const s = load(); return topIds(s.views, limit); },
    topDownloaded(limit = 10) { const s = load(); return topIds(s.downloads, limit); },
    shareResource
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResourcePage, { once: true });
  } else {
    initResourcePage();
  }
})();