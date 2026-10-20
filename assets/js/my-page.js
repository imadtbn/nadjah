(() => {
  'use strict';

  function waitForReady() {
    return new Promise((resolve) => {
      let userTimer = null;
      let attempts = 0;

      const finish = () => {
        const core = window.NadjahCore;
        if (!core?.loadResources) {
          resolve(null);
          return;
        }
        core.loadResources()
          .then((data) => resolve(data?.resources ? data : null))
          .catch(() => resolve(null));
      };

      const waitForUser = () => {
        if (window.NadjahUser) {
          if (userTimer) clearInterval(userTimer);
          finish();
          return;
        }
        attempts += 1;
        if (attempts > 100) {
          if (userTimer) clearInterval(userTimer);
          resolve(null);
          return;
        }
        if (!userTimer) userTimer = setInterval(waitForUser, 40);
      };

      const start = () => {
        const core = window.NadjahCore;
        if (!core?.dataReady) return;
        core.dataReady.then(waitForUser).catch(() => waitForUser());
      };

      if (window.NadjahCore?.dataReady) {
        start();
      } else {
        document.addEventListener('nadjah:data-ready', start, { once: true });
      }
    });
  }

  const byId = (name) => document.getElementById(name);

  function empty(target, message) {
    if (!target) return;
    const node = document.createElement('div');
    node.className = 'user-empty';
    node.textContent = message;
    target.replaceChildren(node);
  }

  function makeIcon(className) {
    const icon = document.createElement('i');
    icon.className = className;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  function makeAction(label, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function card(item, options = {}) {
    const article = document.createElement('article');
    article.className = 'user-resource-card';

    const link = document.createElement('a');
    link.className = 'user-resource-link';
    link.href = window.NadjahCore.resourceUrl(item.id);

    const main = document.createElement('div');
    main.className = 'user-resource-main';

    const title = document.createElement('strong');
    title.textContent = item.title || 'نموذج تعليمي';
    main.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'user-resource-meta';
    [
      item.subject,
      item.levelLabel,
      item.semester ? 'الفصل ' + item.semester : '',
      item.corrected ? 'مع التصحيح' : ''
    ].filter(Boolean).forEach((value) => {
      const chip = document.createElement('span');
      chip.textContent = value;
      meta.appendChild(chip);
    });
    main.appendChild(meta);
    link.appendChild(main);

    if (options.badge) {
      const badge = document.createElement('span');
      badge.className = 'user-resource-badge';
      badge.textContent = String(options.badge);
      link.appendChild(badge);
    }

    const actions = document.createElement('div');
    actions.className = 'user-resource-actions';

    const share = makeAction('مشاركة', 'user-card-action', async () => {
      share.disabled = true;
      const result = await window.NadjahUser.shareResource(item);
      share.replaceChildren();
      if (result === 'shared') {
        share.append(makeIcon('fas fa-check'), document.createTextNode(' تمت المشاركة'));
      } else if (result === 'copied') {
        share.append(makeIcon('fas fa-check'), document.createTextNode(' تم نسخ الرابط'));
      } else {
        share.append(makeIcon('fas fa-share-nodes'), document.createTextNode(' مشاركة'));
      }
      share.disabled = false;
      if (result) {
        window.setTimeout(() => {
          share.replaceChildren(makeIcon('fas fa-share-nodes'), document.createTextNode(' مشاركة'));
        }, 1800);
      }
    });
    share.setAttribute('aria-label', 'مشاركة ' + (item.title || 'النموذج'));
    share.prepend(makeIcon('fas fa-share-nodes'));
    actions.appendChild(share);

    if (options.removableFavorite) {
      const remove = makeAction('إزالة من المفضلة', 'user-card-action user-card-remove', () => {
        window.NadjahUser.toggleFavorite(item.id);
      });
      remove.setAttribute('aria-label', 'إزالة ' + (item.title || 'النموذج') + ' من المفضلة');
      remove.prepend(makeIcon('fas fa-heart-crack'));
      actions.appendChild(remove);
    }

    article.append(link, actions);
    return article;
  }

  function renderIds(target, list, map, emptyText, metricMap, options = {}) {
    if (!target) return;
    target.replaceChildren();
    const items = (list || []).map((id) => map.get(id)).filter(Boolean);
    if (!items.length) return empty(target, emptyText);
    items.forEach((item) => {
      const badge = metricMap?.[item.id];
      target.appendChild(card(item, { badge: badge ? String(badge) : '', ...options }));
    });
  }

  function renderItems(target, items, emptyText) {
    if (!target) return;
    target.replaceChildren();
    if (!items.length) return empty(target, emptyText);
    items.forEach((item) => target.appendChild(card(item)));
  }

  function addSectionAction(gridId, label, action, className = 'user-card-action') {
    const grid = byId(gridId);
    const head = grid?.closest('.user-section')?.querySelector('.user-section-head');
    if (!head || head.querySelector('[data-user-section-action="' + gridId + '"]')) return;
    const button = makeAction(label, className, action);
    button.dataset.userSectionAction = gridId;
    head.appendChild(button);
  }

  waitForReady().then((data) => {
    if (!data?.resources?.resources || !window.NadjahUser) {
      const message = 'تعذر تحميل فهرس النماذج. تحقق من الاتصال ثم أعد فتح الصفحة.';
      ['favoritesGrid', 'recentGrid', 'viewsGrid', 'downloadsGrid', 'recommendationsGrid'].forEach((name) => {
        const target = byId(name);
        if (target) empty(target, message);
      });
      return;
    }

    const resources = data.resources.resources || [];
    const map = new Map(resources.map((item) => [item.id, item]));
    const cycle = byId('prefCycle');
    const level = byId('prefLevel');
    const subject = byId('prefSubject');
    const semester = byId('prefSemester');
    const storageNotice = document.querySelector('.user-hub-kicker');

    const levels = [...new Set(resources.map((item) => item.levelLabel).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'ar'));
    const subjects = [...new Set(resources.map((item) => item.subject).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'ar'));

    levels.forEach((name) => level.add(new Option(name, name)));
    subjects.forEach((name) => subject.add(new Option(name, name)));

    function renderAll() {
      const state = window.NadjahUser.load();
      const favorites = state.favorites || [];
      const recent = state.recent || [];

      byId('favoritesCount').textContent = favorites.length + ' محفوظ';
      byId('recentCount').textContent = recent.length + ' عنصر';

      if (storageNotice) {
        storageNotice.textContent = window.NadjahUser.isPersistent()
          ? 'بياناتك محفوظة على جهازك فقط'
          : 'التخزين الدائم غير متاح؛ ستبقى البيانات خلال هذه الجلسة فقط';
      }

      renderIds(
        byId('favoritesGrid'),
        favorites,
        map,
        'لم تحفظ أي نموذج في المفضلة بعد.',
        null,
        { removableFavorite: true }
      );
      renderIds(byId('recentGrid'), recent.slice(0, 12), map, 'لا يوجد سجل مشاهدة بعد.');
      renderIds(byId('viewsGrid'), window.NadjahUser.topViewed(8), map, 'لا توجد زيارات مسجلة بعد.', state.views);
      renderIds(byId('downloadsGrid'), window.NadjahUser.topDownloaded(8), map, 'لا توجد تحميلات مسجلة بعد.', state.downloads);
      renderItems(
        byId('recommendationsGrid'),
        window.NadjahUser.recommendations(resources, 12),
        'ابدأ بتحديد تفضيلاتك أو تصفح بعض النماذج للحصول على اقتراحات.'
      );

      const preferences = state.preferences || {};
      cycle.value = preferences.cycleId || '';
      level.value = preferences.levelLabel || '';
      subject.value = preferences.subject || '';
      semester.value = preferences.semester || '';
    }

    [cycle, level, subject, semester].forEach((control) => {
      control.addEventListener('change', () => {
        window.NadjahUser.setPreferences({
          cycleId: cycle.value,
          levelLabel: level.value,
          subject: subject.value,
          semester: semester.value
        });
      });
    });

    addSectionAction('recentGrid', 'مسح سجل المشاهدة', () => {
      window.NadjahUser.clearRecent();
    });
    addSectionAction('viewsGrid', 'مسح إحصاءات الاستخدام', () => {
      window.NadjahUser.clearMetrics();
    });

    byId('clearUserData')?.addEventListener('click', () => {
      window.NadjahUser.reset();
    });

    document.addEventListener('nadjah:user-state', renderAll);
    renderAll();
  });
})();
