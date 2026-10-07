(() => {
  'use strict';

  function waitForReady() {
    return new Promise((resolve) => {
      const done = () => {
        if (window.NadjahCore?.data && window.NadjahUser) resolve(window.NadjahCore.data);
      };
      if (window.NadjahCore?.dataReady) {
        window.NadjahCore.dataReady.then(() => {
          if (window.NadjahUser) resolve(window.NadjahCore.data);
          else {
            const timer = setInterval(() => {
              if (window.NadjahUser) { clearInterval(timer); resolve(window.NadjahCore.data); }
            }, 40);
          }
        });
      } else {
        document.addEventListener('nadjah:data-ready', done, { once: true });
      }
    });
  }

  const ids = (name) => document.getElementById(name);

  function empty(target, text) {
    target.innerHTML = '<div class="user-empty">' + text + '</div>';
  }

  function card(item, badge = '') {
    const a = document.createElement('a');
    a.className = 'user-resource-card';
    a.href = window.NadjahCore.resourceUrl(item.id);
    a.innerHTML = `
      <div class="user-resource-main">
        <strong>${item.title}</strong>
        <div class="user-resource-meta">
          ${item.subject ? '<span>' + item.subject + '</span>' : ''}
          ${item.levelLabel ? '<span>' + item.levelLabel + '</span>' : ''}
          ${item.semester ? '<span>الفصل ' + item.semester + '</span>' : ''}
          ${item.corrected ? '<span>مع التصحيح</span>' : ''}
        </div>
      </div>
      ${badge ? '<span class="user-resource-badge">' + badge + '</span>' : ''}
    `;
    return a;
  }

  function renderIds(target, list, map, emptyText, metricMap) {
    target.innerHTML = '';
    const items = list.map((id) => map.get(id)).filter(Boolean);
    if (!items.length) return empty(target, emptyText);
    items.forEach((item) => {
      const value = metricMap?.[item.id];
      target.appendChild(card(item, value ? String(value) : ''));
    });
  }

  function renderItems(target, items, emptyText) {
    target.innerHTML = '';
    if (!items.length) return empty(target, emptyText);
    items.forEach((item) => target.appendChild(card(item)));
  }

  waitForReady().then((data) => {
    const resources = data.resources.resources || [];
    const map = new Map(resources.map((item) => [item.id, item]));
    const cycle = ids('prefCycle');
    const level = ids('prefLevel');
    const subject = ids('prefSubject');
    const semester = ids('prefSemester');

    const levels = [...new Set(resources.map((x) => x.levelLabel).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
    const subjects = [...new Set(resources.map((x) => x.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));

    levels.forEach((name) => level.add(new Option(name, name)));
    subjects.forEach((name) => subject.add(new Option(name, name)));

    function renderAll() {
      const state = window.NadjahUser.load();
      const fav = state.favorites || [];
      const recent = state.recent || [];

      ids('favoritesCount').textContent = fav.length + ' محفوظ';
      ids('recentCount').textContent = recent.length + ' عنصر';

      renderIds(ids('favoritesGrid'), fav, map, 'لم تحفظ أي نموذج في المفضلة بعد.');
      renderIds(ids('recentGrid'), recent.slice(0, 12), map, 'لا يوجد سجل مشاهدة بعد.');
      renderIds(ids('viewsGrid'), window.NadjahUser.topViewed(8), map, 'لا توجد زيارات مسجلة بعد.', state.views);
      renderIds(ids('downloadsGrid'), window.NadjahUser.topDownloaded(8), map, 'لا توجد تحميلات مسجلة بعد.', state.downloads);
      renderItems(ids('recommendationsGrid'), window.NadjahUser.recommendations(resources, 12), 'ابدأ بتحديد تفضيلاتك أو تصفح بعض النماذج للحصول على اقتراحات.');

      const pref = state.preferences || {};
      cycle.value = pref.cycleId || '';
      level.value = pref.levelLabel || '';
      subject.value = pref.subject || '';
      semester.value = pref.semester || '';
    }

    [cycle, level, subject, semester].forEach((control) => {
      control.addEventListener('change', () => {
        window.NadjahUser.setPreferences({
          cycleId: cycle.value,
          levelLabel: level.value,
          subject: subject.value,
          semester: semester.value
        });
        renderAll();
      });
    });

    ids('clearUserData').addEventListener('click', () => {
      localStorage.removeItem('nadjah:user:v1');
      renderAll();
    });

    document.addEventListener('nadjah:user-state', renderAll);
    renderAll();
  });
})();