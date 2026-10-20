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
function addSubjectTree_(yearFolder, subjectNames) {
  subjectNames.forEach(subject => {
    const subjectFolder = ensureFolder_(yearFolder, subject);
    addTermTree_(subjectFolder);
  });
}
function addTermTree_(subjectFolder) {
  TERMS.forEach(term => {
    const termFolder = ensureFolder_(subjectFolder, term);
    RESOURCE_FOLDERS.forEach(category => ensureFolder_(termFolder, category));
  });
}

/**
 * شغّل هذه الدالة يدويًا مرة واحدة من محرر Apps Script.
 * تنشئ المجلدات الناقصة فقط ولا تحذف أو تعيد تسمية الملفات الموجودة.
 */
function setupLibraryStructure() {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const primary = ensureFolder_(root, 'الطور الابتدائي');
  Object.keys(PRIMARY_SUBJECTS).forEach(year => addSubjectTree_(ensureFolder_(primary, year), PRIMARY_SUBJECTS[year]));

  const middle = ensureFolder_(root, 'الطور المتوسط');
  ['السنة الأولى','السنة الثانية','السنة الثالثة','السنة الرابعة'].forEach(year => addSubjectTree_(ensureFolder_(middle, year), MIDDLE_SUBJECTS));

  const secondary = ensureFolder_(root, 'الطور الثانوي');
  Object.keys(SECONDARY_BRANCHES).forEach(year => {
    const yearFolder = ensureFolder_(secondary, year);
    Object.keys(SECONDARY_BRANCHES[year]).forEach(branch => {
      addSubjectTree_(ensureFolder_(yearFolder, branch), SECONDARY_BRANCHES[year][branch]);
    });
  });
  return 'اكتمل إنشاء الهيكل الموحد داخل مجلد مكتبة منصة النجاح.';
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
