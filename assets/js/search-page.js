(() => {
    'use strict';

    const typeLabels = {
        homework: 'فروض',
        exam: 'اختبارات',
        exercise: 'تمارين',
        revision: 'مراجعة'
    };

    const semesterLabels = {
        '1': 'الفصل الأول',
        '2': 'الفصل الثاني',
        '3': 'الفصل الثالث'
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
    const loadMore = document.getElementById('searchLoadMore');

    let allResources = [];
    let currentResults = [];
    let visibleCount = 8;
    const PAGE_SIZE = 8;

    function chip(text) {
        const span = document.createElement('span');
        span.className = 'search-chip';
        span.textContent = text;
        return span;
    }

    function resourceLevel(item) {
        const direct = String(item.levelLabel || '').trim();
        if (
            direct &&
            !/^الطور\s/.test(direct) &&
            !['ابتدائي', 'متوسط', 'ثانوي'].includes(direct)
        ) {
            return direct;
        }

        const trail = Array.isArray(item.breadcrumb) ? item.breadcrumb : [];
        const levelFromTrail = trail.find((part) =>
            /^(?:السنة|الصف)\s/.test(String(part || '').trim()) ||
            /تحضير/.test(String(part || '')) ||
            /(?:البكالوريا|المتوسط)/.test(String(part || '')) && /امتحان|إمتحان/.test(String(part || ''))
        );
        return String(levelFromTrail || direct || '').trim();
    }

    function uniqueSorted(values) {
        return [...new Set(values.filter(Boolean))]
            .sort((a, b) => String(a).localeCompare(String(b), 'ar', { numeric: true }));
    }

    function replaceOptions(select, values, placeholder, labeler = (value) => value) {
        const current = select.value;
        select.innerHTML = '';

        const all = document.createElement('option');
        all.value = '';
        all.textContent = placeholder;
        select.appendChild(all);

        values.forEach((value) => {
            const option = document.createElement('option');
            option.value = String(value);
            option.textContent = labeler(String(value));
            select.appendChild(option);
        });

        if (values.map(String).includes(current)) select.value = current;
    }

    function setControlState(select, enabled, hint) {
        select.disabled = !enabled;
        select.closest('.search-filter-step')?.classList.toggle('is-disabled', !enabled);
        if (hint) select.setAttribute('title', hint);
        else select.removeAttribute('title');
    }

    function filteredBase({ through = 'semester' } = {}) {
        let items = allResources.slice();
        const order = ['cycle', 'level', 'subject', 'type', 'semester'];
        const stop = order.indexOf(through);

        if (stop >= 0 && cycle.value) items = items.filter((item) => item.cycleId === cycle.value);
        if (stop >= 1 && level.value) items = items.filter((item) => resourceLevel(item) === level.value);
        if (stop >= 2 && subject.value) items = items.filter((item) => item.subject === subject.value);
        if (stop >= 3 && type.value) items = items.filter((item) => item.type === type.value);
        if (stop >= 4 && semester.value) items = items.filter((item) => String(item.semester || '') === semester.value);

        return items;
    }

    function rebuildLevels(preserve = true) {
        const previous = preserve ? level.value : '';
        const values = cycle.value
            ? uniqueSorted(allResources.filter((item) => item.cycleId === cycle.value).map(resourceLevel))
            : [];

        replaceOptions(level, values, cycle.value ? 'كل السنوات' : 'اختر الطور أولًا');
        if (previous && values.includes(previous)) level.value = previous;
        setControlState(level, Boolean(cycle.value), 'اختر الطور أولًا');
    }

    function rebuildSubjects(preserve = true) {
        const previous = preserve ? subject.value : '';
        const base = cycle.value && level.value
            ? allResources.filter((item) => item.cycleId === cycle.value && resourceLevel(item) === level.value)
            : [];
        const values = uniqueSorted(base.map((item) => item.subject));

        replaceOptions(subject, values, level.value ? 'كل المواد' : 'اختر السنة أولًا');
        if (previous && values.includes(previous)) subject.value = previous;
        setControlState(subject, Boolean(cycle.value && level.value), 'اختر السنة أولًا');
    }

    function rebuildTypes(preserve = true) {
        const previous = preserve ? type.value : '';
        const base = cycle.value && level.value && subject.value
            ? allResources.filter((item) =>
                item.cycleId === cycle.value &&
                resourceLevel(item) === level.value &&
                item.subject === subject.value
            )
            : [];
        const values = ['homework', 'exam', 'exercise', 'revision'].filter((value) =>
            base.some((item) => item.type === value)
        );

        replaceOptions(type, values, subject.value ? 'كل الأنواع' : 'اختر المادة أولًا', (value) => typeLabels[value] || value);
        if (previous && values.includes(previous)) type.value = previous;
        setControlState(type, Boolean(cycle.value && level.value && subject.value), 'اختر المادة أولًا');
    }

    function rebuildSemesters(preserve = true) {
        const previous = preserve ? semester.value : '';
        const base = cycle.value && level.value && subject.value && type.value
            ? allResources.filter((item) =>
                item.cycleId === cycle.value &&
                resourceLevel(item) === level.value &&
                item.subject === subject.value &&
                item.type === type.value
            )
            : [];
        const values = uniqueSorted(base.map((item) => String(item.semester || '')).filter(Boolean));

        replaceOptions(semester, values, type.value ? 'كل الفصول' : 'اختر نوع الموضوع أولًا', (value) => semesterLabels[value] || `الفصل ${value}`);
        if (previous && values.includes(previous)) semester.value = previous;
        setControlState(semester, Boolean(cycle.value && level.value && subject.value && type.value), 'اختر نوع الموضوع أولًا');
    }

    function rebuildCascade(from, preserve = false) {
        const stages = ['cycle', 'level', 'subject', 'type', 'semester'];
        const index = stages.indexOf(from);

        if (index <= 0) rebuildLevels(preserve);
        if (index <= 1) rebuildSubjects(preserve);
        if (index <= 2) rebuildTypes(preserve);
        if (index <= 3) rebuildSemesters(preserve);
    }

    function render(items, { reset = true } = {}) {
        currentResults = items.slice();
        if (reset) visibleCount = PAGE_SIZE;

        results.innerHTML = '';
        summary.textContent = `${items.length} نتيجة`;

        if (!items.length) {
            const empty = document.createElement('div');
            empty.className = 'search-empty-state';
            empty.textContent = 'لا توجد نتائج بهذه المعايير. جرّب تغيير أحد خيارات الفلترة.';
            results.appendChild(empty);
            if (loadMore) loadMore.hidden = true;
            return;
        }

        items.slice(0, visibleCount).forEach((item) => {
            const card = document.createElement('a');
            card.className = 'search-result-card';
            card.href = window.NadjahCore.resourceUrl(item.id);

            const title = document.createElement('h2');
            title.textContent = item.title;
            card.appendChild(title);

            const meta = document.createElement('div');
            meta.className = 'search-result-meta';
            if (item.subject) meta.appendChild(chip(item.subject));
            const levelName = resourceLevel(item);
            if (levelName) meta.appendChild(chip(levelName));
            meta.appendChild(chip(typeLabels[item.type] || 'نموذج'));
            if (item.semester) meta.appendChild(chip(semesterLabels[String(item.semester)] || `الفصل ${item.semester}`));
            if (item.corrected) meta.appendChild(chip('مع التصحيح'));

            card.appendChild(meta);
            results.appendChild(card);
        });

        if (loadMore) {
            const remaining = Math.max(0, items.length - visibleCount);
            loadMore.hidden = remaining === 0;
            loadMore.innerHTML = remaining
                ? `<i class="fas fa-plus" aria-hidden="true"></i> إظهار المزيد (${remaining})`
                : '';
        }
    }
    function applyFilters() {
        const query = q.value.trim();
        let items = window.NadjahCore.searchResources(query);

        if (cycle.value) items = items.filter((item) => item.cycleId === cycle.value);
        if (level.value) items = items.filter((item) => resourceLevel(item) === level.value);
        if (subject.value) items = items.filter((item) => item.subject === subject.value);
        if (type.value) items = items.filter((item) => item.type === type.value);
        if (semester.value) items = items.filter((item) => String(item.semester || '') === semester.value);

        render(items, { reset: true });
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

    function onCycleChange() {
        level.value = '';
        subject.value = '';
        type.value = '';
        semester.value = '';
        rebuildCascade('cycle', false);
        updateUrl();
        applyFilters();
    }

    function onLevelChange() {
        subject.value = '';
        type.value = '';
        semester.value = '';
        rebuildCascade('level', false);
        updateUrl();
        applyFilters();
    }

    function onSubjectChange() {
        type.value = '';
        semester.value = '';
        rebuildCascade('subject', false);
        updateUrl();
        applyFilters();
    }

    function onTypeChange() {
        semester.value = '';
        rebuildCascade('type', false);
        updateUrl();
        applyFilters();
    }

    function onSemesterChange() {
        updateUrl();
        applyFilters();
    }

    waitForCore().then((data) => {
        if (!data) {
            summary.textContent = 'تعذر تحميل قاعدة البيانات.';
            return;
        }

        allResources = data.resources.resources || [];

        const params = new URLSearchParams(window.location.search);
        q.value = params.get('q') || '';
        cycle.value = params.get('cycle') || '';

        rebuildLevels(false);
        const requestedLevel = params.get('level') || '';
        if ([...level.options].some((option) => option.value === requestedLevel)) level.value = requestedLevel;

        rebuildSubjects(false);
        const requestedSubject = params.get('subject') || '';
        if ([...subject.options].some((option) => option.value === requestedSubject)) subject.value = requestedSubject;

        rebuildTypes(false);
        const requestedType = params.get('type') || '';
        if ([...type.options].some((option) => option.value === requestedType)) type.value = requestedType;

        rebuildSemesters(false);
        const requestedSemester = params.get('semester') || '';
        if ([...semester.options].some((option) => option.value === requestedSemester)) semester.value = requestedSemester;

        q.addEventListener('input', () => {
            updateUrl();
            applyFilters();
        });
        cycle.addEventListener('change', onCycleChange);
        level.addEventListener('change', onLevelChange);
        subject.addEventListener('change', onSubjectChange);
        type.addEventListener('change', onTypeChange);
        semester.addEventListener('change', onSemesterChange);

        loadMore?.addEventListener('click', () => {
            visibleCount += PAGE_SIZE;
            render(currentResults, { reset: false });
        });

        updateUrl();
        applyFilters();
    });
})();