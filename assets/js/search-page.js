(() => {
    'use strict';

    const typeLabels = {
        homework: 'فرض',
        exam: 'اختبار',
        exercise: 'تمرين',
        revision: 'مراجعة'
    };

    function waitForCore() {
        if (window.NadjahCore?.dataReady) return window.NadjahCore.dataReady;
        return new Promise((resolve) => {
            const onReady = () => resolve(window.NadjahCore?.data || null);
            document.addEventListener('nadjah:data-ready', onReady, { once: true });
            const timer = setInterval(() => {
                if (window.NadjahCore?.dataReady) {
                    clearInterval(timer);
                    window.NadjahCore.dataReady.then(resolve);
                }
            }, 50);
            setTimeout(() => {
                clearInterval(timer);
                resolve(window.NadjahCore?.data || null);
            }, 5000);
        });
    }

    const q = document.getElementById('searchQuery');
    const cycle = document.getElementById('cycleFilter');
    const level = document.getElementById('levelFilter');
    const subject = document.getElementById('subjectFilter');
    const type = document.getElementById('typeFilter');
    const semester = document.getElementById('semesterFilter');
    const results = document.getElementById('searchResults');
    const summary = document.getElementById('searchSummary');

    function chip(text) {
        const span = document.createElement('span');
        span.className = 'search-chip';
        span.textContent = text;
        return span;
    }

    function render(items) {
        results.innerHTML = '';
        summary.textContent = `${items.length} نتيجة`;

        if (!items.length) {
            const empty = document.createElement('div');
            empty.className = 'search-empty-state';
            empty.textContent = 'لا توجد نتائج بهذه المعايير. جرّب إزالة أحد الفلاتر أو تبسيط كلمات البحث.';
            results.appendChild(empty);
            return;
        }

        items.slice(0, 120).forEach((item) => {
            const card = document.createElement('a');
            card.className = 'search-result-card';
            card.href = window.NadjahCore.resourceUrl(item.id);

            const title = document.createElement('h2');
            title.textContent = item.title;
            card.appendChild(title);

            const meta = document.createElement('div');
            meta.className = 'search-result-meta';
            if (item.subject) meta.appendChild(chip(item.subject));
            meta.appendChild(chip(typeLabels[item.type] || 'نموذج'));
            if (item.semester) meta.appendChild(chip(`الفصل ${item.semester}`));
            if (item.corrected) meta.appendChild(chip('مع التصحيح'));

            const trail = item.breadcrumb?.filter(Boolean)?.slice(1, 4)?.join(' ← ');
            if (trail) meta.appendChild(chip(trail));

            card.appendChild(meta);
            results.appendChild(card);
        });

        if (items.length > 120) {
            const note = document.createElement('div');
            note.className = 'search-summary';
            note.textContent = 'تم عرض أول 120 نتيجة. استخدم الفلاتر لتضييق البحث.';
            results.appendChild(note);
        }
    }

    function applyFilters() {
        const query = q.value.trim();
        let items = window.NadjahCore.searchResources(query);

        if (cycle.value) items = items.filter((item) => item.cycleId === cycle.value);
        if (level.value) items = items.filter((item) => item.levelLabel === level.value);
        if (subject.value) items = items.filter((item) => item.subject === subject.value);
        if (type.value) items = items.filter((item) => item.type === type.value);
        if (semester.value) items = items.filter((item) => String(item.semester || '') === semester.value);

        render(items);
    }

    function updateUrl() {
        const url = new URL(window.location.href);
        q.value.trim() ? url.searchParams.set('q', q.value.trim()) : url.searchParams.delete('q');
        cycle.value ? url.searchParams.set('cycle', cycle.value) : url.searchParams.delete('cycle');
        level.value ? url.searchParams.set('level', level.value) : url.searchParams.delete('level');
        subject.value ? url.searchParams.set('subject', subject.value) : url.searchParams.delete('subject');
        type.value ? url.searchParams.set('type', type.value) : url.searchParams.delete('type');
        semester.value ? url.searchParams.set('semester', semester.value) : url.searchParams.delete('semester');
        history.replaceState(null, '', url);
    }

    function handleChange() {
        updateUrl();
        applyFilters();
    }

    waitForCore().then((data) => {
        if (!data) {
            summary.textContent = 'تعذر تحميل قاعدة البيانات.';
            return;
        }

        const allResources = data.resources.resources || [];
        const levels = [...new Set(allResources.map((item) => item.levelLabel).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'ar'));
        levels.forEach((name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            level.appendChild(option);
        });

        const subjects = [...new Set(allResources.map((item) => item.subject).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'ar'));
        subjects.forEach((name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            subject.appendChild(option);
        });

        const params = new URLSearchParams(window.location.search);
        q.value = params.get('q') || '';
        cycle.value = params.get('cycle') || '';
        level.value = params.get('level') || '';
        subject.value = params.get('subject') || '';
        type.value = params.get('type') || '';
        semester.value = params.get('semester') || '';

        [q, cycle, level, subject, type, semester].forEach((control) => {
            control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', handleChange);
        });

        applyFilters();
    });
})();