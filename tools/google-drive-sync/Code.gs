/**
 * منصة النجاح — إنشاء هيكل Drive وفهرسة ملفات PDF.
 * شغّل setupLibraryStructure مرة واحدة لإنشاء المجلدات، ثم انشره كتطبيق ويب.
 */
const ROOT_FOLDER_ID = '1MnYHPr6Qnd35YRQKN1P6QklAXb_bmiZA';

const CYCLE_MAP = {
  'الطور الابتدائي': 'primary', 'الابتدائي': 'primary',
  'الطور المتوسط': 'middle', 'المتوسط': 'middle',
  'الطور الثانوي': 'secondary', 'الثانوي': 'secondary'
};
const TERM_MAP = {'الفصل الأول':1,'الفصل الاول':1,'الفصل 1':1,'الفصل الثاني':2,'الفصل 2':2,'الفصل الثالث':3,'الفصل 3':3};
const TYPE_MAP = {
  'الدروس والملخصات':'lesson','الدروس':'lesson','الملخصات':'summary',
  'التمارين':'exercise','الفروض والاختبارات':'exam','الفروض':'homework',
  'الاختبارات':'exam','الحلول والتصحيحات':'correction','التصحيحات':'correction'
};
const RESOURCE_FOLDERS = ['الدروس والملخصات','التمارين','الفروض والاختبارات','الحلول والتصحيحات'];
const TERMS = ['الفصل الأول','الفصل الثاني','الفصل الثالث'];

const PRIMARY_SUBJECTS = {
  'السنة الأولى':['اللغة العربية','التربية الإسلامية','الرياضيات','التربية العلمية','التربية المدنية','التربية الفنية','اللغة الأمازيغية'],
  'السنة الثانية':['اللغة العربية','التربية الإسلامية','الرياضيات','التربية العلمية','التربية المدنية','التربية الفنية','اللغة الأمازيغية'],
  'السنة الثالثة':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','التربية الإسلامية','الرياضيات','التربية العلمية والتكنولوجية','التاريخ والجغرافيا','التربية المدنية','التربية الفنية','اللغة الأمازيغية'],
  'السنة الرابعة':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','التربية الإسلامية','الرياضيات','التربية العلمية والتكنولوجية','التاريخ والجغرافيا','التربية المدنية','التربية الفنية','اللغة الأمازيغية'],
  'السنة الخامسة':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','التربية الإسلامية','الرياضيات','التربية العلمية والتكنولوجية','التاريخ والجغرافيا','التربية المدنية','التربية الفنية','اللغة الأمازيغية']
};
const MIDDLE_SUBJECTS = ['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الرياضيات','علوم الطبيعة والحياة','العلوم الفيزيائية والتكنولوجيا','التاريخ والجغرافيا','التربية الإسلامية','التربية المدنية','الإعلام الآلي','التربية الفنية','اللغة الأمازيغية'];
const SECONDARY_BRANCHES = {
  'السنة الأولى': {
    'جذع مشترك علوم وتكنولوجيا':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الرياضيات','العلوم الفيزيائية','علوم الطبيعة والحياة','التكنولوجيا','التاريخ والجغرافيا','التربية الإسلامية','الإعلام الآلي'],
    'جذع مشترك آداب':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الرياضيات','التاريخ والجغرافيا','التربية الإسلامية','الإعلام الآلي']
  },
  'السنة الثانية': {
    'شعبة علوم تجريبية':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الرياضيات','العلوم الفيزيائية','علوم الطبيعة والحياة','العلوم الإسلامية','التاريخ والجغرافيا','الفلسفة'],
    'شعبة رياضيات':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الرياضيات','العلوم الفيزيائية','علوم الطبيعة والحياة','العلوم الإسلامية','التاريخ والجغرافيا','الفلسفة'],
    'شعبة تقني رياضي':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الرياضيات','العلوم الفيزيائية','التكنولوجيا','العلوم الإسلامية','التاريخ والجغرافيا','الفلسفة'],
    'شعبة تسيير واقتصاد':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الرياضيات','التسيير المحاسبي والمالي','الاقتصاد والمناجمنت','القانون','التاريخ والجغرافيا','العلوم الإسلامية','الفلسفة'],
    'شعبة آداب وفلسفة':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الفلسفة','التاريخ والجغرافيا','العلوم الإسلامية','الرياضيات'],
    'شعبة لغات أجنبية':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','لغة أجنبية ثالثة','الفلسفة','التاريخ والجغرافيا','العلوم الإسلامية','الرياضيات']
  },
  'السنة الثالثة': {
    'شعبة علوم تجريبية':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الرياضيات','العلوم الفيزيائية','علوم الطبيعة والحياة','العلوم الإسلامية','التاريخ والجغرافيا','الفلسفة'],
    'شعبة رياضيات':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الرياضيات','العلوم الفيزيائية','علوم الطبيعة والحياة','العلوم الإسلامية','التاريخ والجغرافيا','الفلسفة'],
    'شعبة تقني رياضي':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الرياضيات','العلوم الفيزيائية','التكنولوجيا','العلوم الإسلامية','التاريخ والجغرافيا','الفلسفة'],
    'شعبة تسيير واقتصاد':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الرياضيات','التسيير المحاسبي والمالي','الاقتصاد والمناجمنت','القانون','التاريخ والجغرافيا','العلوم الإسلامية','الفلسفة'],
    'شعبة آداب وفلسفة':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','الفلسفة','التاريخ والجغرافيا','العلوم الإسلامية','الرياضيات'],
    'شعبة لغات أجنبية':['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','لغة أجنبية ثالثة','الفلسفة','التاريخ والجغرافيا','العلوم الإسلامية','الرياضيات']
  }
};

function ensureFolder_(parent, name) {
  const matches = parent.getFoldersByName(name);
  return matches.hasNext() ? matches.next() : parent.createFolder(name);
}

/** يبني قائمة مسارات ثابتة حتى يمكن استكمال الإنشاء من آخر نقطة محفوظة. */
function buildFolderPlan_() {
  const plan = [];
  function add(path) { plan.push(path); }
  function addSubject(yearPath, subjectNames) {
    subjectNames.forEach(subject => {
      const subjectPath = yearPath.concat([subject]);
      add(subjectPath);
      TERMS.forEach(term => {
        const termPath = subjectPath.concat([term]);
        add(termPath);
        RESOURCE_FOLDERS.forEach(category => add(termPath.concat([category])));
      });
    });
  }

  add(['الطور الابتدائي']);
  Object.keys(PRIMARY_SUBJECTS).forEach(year => {
    const yearPath = ['الطور الابتدائي', year];
    add(yearPath);
    addSubject(yearPath, PRIMARY_SUBJECTS[year]);
  });

  add(['الطور المتوسط']);
  ['السنة الأولى','السنة الثانية','السنة الثالثة','السنة الرابعة'].forEach(year => {
    const yearPath = ['الطور المتوسط', year];
    add(yearPath);
    addSubject(yearPath, MIDDLE_SUBJECTS);
  });

  add(['الطور الثانوي']);
  Object.keys(SECONDARY_BRANCHES).forEach(year => {
    const yearPath = ['الطور الثانوي', year];
    add(yearPath);
    Object.keys(SECONDARY_BRANCHES[year]).forEach(branch => {
      const branchPath = yearPath.concat([branch]);
      add(branchPath);
      addSubject(branchPath, SECONDARY_BRANCHES[year][branch]);
    });
  });
  return plan;
}

function ensurePath_(root, path) {
  let folder = root;
  path.forEach(name => { folder = ensureFolder_(folder, name); });
}

/**
 * يبدأ التحقق على دفعات صغيرة لتفادي حدّ مدة التنفيذ.
 * شغّل هذه الدالة يدويًا مرة واحدة، ثم تابع النتيجة من سجل التنفيذ.
 */
function verifyLibraryStructure() {
  const props = PropertiesService.getScriptProperties();
  clearVerificationTriggers_();
  Object.keys(props.getProperties()).forEach(key => {
    if (key.indexOf('LIB_VERIFY_') === 0) props.deleteProperty(key);
  });
  props.setProperty('LIB_VERIFY_INDEX', '0');
  props.setProperty('LIB_VERIFY_COMPLETE', '0');
  props.setProperty('LIB_VERIFY_MISSING_COUNT', '0');
  return continueLibraryStructureVerification();
}

/** يعالج عددًا محدودًا من المسارات، ويحفظ التقدم قبل إنهاء كل تشغيل. */
function continueLibraryStructureVerification() {
  const started = Date.now();
  const maxRunMs = 2 * 60 * 1000;
  const maxPathsPerRun = 12;
  const props = PropertiesService.getScriptProperties();
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const plan = buildFolderPlan_();
  let index = Number(props.getProperty('LIB_VERIFY_INDEX') || 0);
  let complete = Number(props.getProperty('LIB_VERIFY_COMPLETE') || 0);
  let missingCount = Number(props.getProperty('LIB_VERIFY_MISSING_COUNT') || 0);
  let processed = 0;

  while (index < plan.length && processed < maxPathsPerRun && Date.now() - started < maxRunMs) {
    const path = plan[index];
    let folder = root;
    let found = true;
    for (let i = 0; i < path.length; i++) {
      const matches = folder.getFoldersByName(path[i]);
      if (!matches.hasNext()) {
        found = false;
        break;
      }
      folder = matches.next();
    }

    if (found) {
      complete++;
    } else {
      missingCount++;
      props.setProperty('LIB_VERIFY_MISSING_' + String(missingCount).padStart(5, '0'), path.join(' / '));
    }

    index++;
    processed++;
    // حفظ التقدم بعد كل مسار يجعل الاستئناف آمنًا.
    props.setProperties({
      LIB_VERIFY_INDEX: String(index),
      LIB_VERIFY_COMPLETE: String(complete),
      LIB_VERIFY_MISSING_COUNT: String(missingCount)
    }, false);
  }

  if (index < plan.length) {
    clearVerificationTriggers_();
    ScriptApp.newTrigger('continueLibraryStructureVerification').timeBased().after(60 * 1000).create();
    const progress = 'التحقق جارٍ: ' + index + ' / ' + plan.length + ' مسارًا؛ الناقص حتى الآن: ' + missingCount;
    Logger.log(progress);
    return progress + '. سيستمر تلقائيًا على دفعات.';
  }

  clearVerificationTriggers_();
  const allProps = props.getProperties();
  const missing = Object.keys(allProps)
    .filter(key => key.indexOf('LIB_VERIFY_MISSING_') === 0)
    .sort()
    .map(key => allProps[key]);
  const report = {
    status: missingCount === 0 ? 'complete' : 'missing_folders_found',
    totalPaths: plan.length,
    completePaths: complete,
    missingCount: missingCount,
    missingPaths: missing.slice(0, 100),
    moreMissing: Math.max(0, missing.length - 100)
  };
  Logger.log('نتيجة التحقق النهائية:\n' + JSON.stringify(report, null, 2));
  props.deleteProperty('LIB_VERIFY_INDEX');
  props.deleteProperty('LIB_VERIFY_COMPLETE');
  props.deleteProperty('LIB_VERIFY_MISSING_COUNT');
  missing.forEach((_, i) => props.deleteProperty('LIB_VERIFY_MISSING_' + String(i + 1).padStart(5, '0')));
  return missingCount === 0
    ? 'اكتمل التحقق: جميع المسارات ' + plan.length + ' موجودة حسب القالب الحالي.'
    : 'اكتمل التحقق: ' + complete + ' من ' + plan.length + ' مسارًا موجود؛ توجد ' + missingCount + ' مسارات ناقصة. راجع سجل التنفيذ.';
}

function clearVerificationTriggers_() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'continueLibraryStructureVerification') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/** يبدأ إنشاء الهيكل أو يعيد بدء الفهرس؛ لا يحذف أي مجلد أو ملف. */
function setupLibraryStructure() {
  clearSetupTriggers_();
  PropertiesService.getScriptProperties().setProperty('LIBRARY_SETUP_INDEX', '0');
  continueLibraryStructureSetup();
}

/** تكمل الإنشاء على دفعات لتفادي انتهاء مهلة Apps Script. */
function continueLibraryStructureSetup() {
  const started = Date.now();
  const maxRunMs = 2 * 60 * 1000;
  const maxPathsPerRun = 12;
  const props = PropertiesService.getScriptProperties();
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const plan = buildFolderPlan_();
  let index = Number(props.getProperty('LIBRARY_SETUP_INDEX') || 0);
  let processed = 0;

  while (index < plan.length && processed < maxPathsPerRun && Date.now() - started < maxRunMs) {
    ensurePath_(root, plan[index]);
    index++;
    processed++;
    props.setProperty('LIBRARY_SETUP_INDEX', String(index));
  }

  if (index < plan.length) {
    props.setProperty('LIBRARY_SETUP_INDEX', String(index));
    clearSetupTriggers_();
    ScriptApp.newTrigger('continueLibraryStructureSetup').timeBased().after(60 * 1000).create();
    Logger.log('تم إنشاء جزء من الهيكل. التقدم: ' + index + ' / ' + plan.length + '. سيستمر تلقائيًا.');
    return 'الإنشاء مستمر على دفعات: ' + index + ' / ' + plan.length;
  }

  props.deleteProperty('LIBRARY_SETUP_INDEX');
  clearSetupTriggers_();
  Logger.log('اكتمل إنشاء الهيكل. عدد المسارات التي تمت مراجعتها: ' + plan.length);
  return 'اكتمل إنشاء الهيكل كاملًا. عدد المسارات التي تمت مراجعتها: ' + plan.length;
}

function clearSetupTriggers_() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'continueLibraryStructureSetup') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function doGet(e) {
  const data = buildManifest_();
  const callback = e && e.parameter && e.parameter.callback;
  const json = JSON.stringify(data);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function buildManifest_() {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const resources = [];
  const cycles = root.getFolders();
  while (cycles.hasNext()) {
    const cycleFolder = cycles.next();
    const cycleId = CYCLE_MAP[cycleFolder.getName()];
    if (!cycleId) continue;
    const years = cycleFolder.getFolders();
    while (years.hasNext()) {
      const yearFolder = years.next();
      const yearLabel = yearFolder.getName();
      const children = yearFolder.getFolders();
      while (children.hasNext()) {
        const child = children.next();
        if (cycleId === 'secondary') {
          const branchName = child.getName();
          const subjects = child.getFolders();
          while (subjects.hasNext()) {
            collectSubject_(subjects.next(), [yearLabel], cycleId, yearLabel, branchName, resources);
          }
        } else {
          collectSubject_(child, [yearLabel], cycleId, yearLabel, '', resources);
        }
      }
    }
  }
  const deduped = Array.from(new Map(resources.map(item => [item.id, item])).values());
  deduped.sort((a,b)=>a.cycleId.localeCompare(b.cycleId)||a.levelLabel.localeCompare(b.levelLabel,'ar')||a.subject.localeCompare(b.subject,'ar')||a.semester-b.semester||a.title.localeCompare(b.title,'ar'));
  return {schemaVersion:1,generatedAt:new Date().toISOString(),source:'Google Drive',count:deduped.length,resources:deduped};
}
function collectSubject_(subjectFolder, path, cycleId, levelLabel, branch, resources) {
  const terms = subjectFolder.getFolders();
  while (terms.hasNext()) {
    const termFolder = terms.next();
    const semester = TERM_MAP[termFolder.getName()];
    if (!semester) continue;
    const categories = termFolder.getFolders();
    while (categories.hasNext()) {
      const categoryFolder = categories.next();
      const type = TYPE_MAP[categoryFolder.getName()] || 'resource';
      const files = categoryFolder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        if (file.isTrashed() || file.getMimeType() !== MimeType.PDF) continue;
        const id = file.getId();
        const title = file.getName().replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
        resources.push({
          id:'drive-'+id,title:title,type:type,cycleId:cycleId,subject:subjectFolder.getName(),semester:semester,
          corrected:/تصحيح|حل نموذجي|الحل/i.test(title)||type==='correction',
          previewUrl:'https://drive.google.com/file/d/'+id+'/preview',
          downloadUrl:'https://drive.google.com/file/d/'+id+'/view?usp=sharing',
          source:'Google Drive',driveFileId:id,levelLabel:levelLabel,levelCode:levelCode_(levelLabel),
          branch:branch,meta:['Google Drive','PDF'],page:'',pageTitle:title,
          breadcrumb:[cycleId,levelLabel].concat(branch?[branch]:[]).concat([subjectFolder.getName(),termFolder.getName(),categoryFolder.getName()])
        });
      }
    }
  }
}

function levelCode_(label) {
  const m = label.match(/[0-9٠-٩]+/);
  if (!m) return '';
  return m[0].replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).padStart(2,'0');
}
