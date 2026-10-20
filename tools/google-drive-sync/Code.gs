/**
 * منصة النجاح — فهرسة ملفات PDF من Google Drive.
 *
 * هيكل المجلدات:
 * مكتبة منصة النجاح / الطور / السنة / المادة / الفصل / نوع المورد / ملفات PDF
 *
 * انشر المشروع كتطبيق ويب:
 * Execute as: Me
 * Who has access: Anyone
 * ثم ضع رابط /exec الناتج في assets/js/google-drive-config.js.
 *
 * لا يغيّر هذا السكربت صلاحيات ملفات Drive. اجعل كل ملف قابلًا للعرض
 * لأي شخص لديه الرابط، أو استخدم مصادر عامة أخرى.
 */
const ROOT_FOLDER_ID = 'ضع_معرف_مجلد_مكتبة_منصة_النجاح_هنا';

const CYCLE_MAP = {
  'الطور الابتدائي': 'primary',
  'الابتدائي': 'primary',
  'الطور المتوسط': 'middle',
  'المتوسط': 'middle',
  'الطور الثانوي': 'secondary',
  'الثانوي': 'secondary'
};
const TERM_MAP = {
  'الفصل الأول': 1, 'الفصل الاول': 1, 'الفصل 1': 1, 'الفصل الأول': 1,
  'الفصل الثاني': 2, 'الفصل 2': 2,
  'الفصل الثالث': 3, 'الفصل 3': 3
};
const TYPE_MAP = {
  'الدروس والملخصات': 'lesson',
  'الدروس': 'lesson',
  'الملخصات': 'summary',
  'التمارين': 'exercise',
  'الفروض والاختبارات': 'exam',
  'الفروض': 'homework',
  'الاختبارات': 'exam',
  'الحلول والتصحيحات': 'correction',
  'التصحيحات': 'correction'
};

function doGet(e) {
  const data = buildManifest_();
  const callback = e && e.parameter && e.parameter.callback;
  const json = JSON.stringify(data);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function buildManifest_() {
  if (!ROOT_FOLDER_ID || ROOT_FOLDER_ID.indexOf('ضع_') === 0) {
    throw new Error('يجب ضبط ROOT_FOLDER_ID أولًا.');
  }
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const resources = [];
  const cycles = root.getFolders();
  while (cycles.hasNext()) {
    const cycleFolder = cycles.next();
    const cycleId = CYCLE_MAP[cycleFolder.getName()];
    if (!cycleId) continue;
    const levels = cycleFolder.getFolders();
    while (levels.hasNext()) {
      const levelFolder = levels.next();
      const levelLabel = levelFolder.getName();
      const levelCode = levelCode_(levelLabel);
      const subjects = levelFolder.getFolders();
      while (subjects.hasNext()) {
        const subjectFolder = subjects.next();
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
                id: 'drive-' + id,
                title: title,
                type: type,
                cycleId: cycleId,
                subject: subjectFolder.getName(),
                semester: semester,
                corrected: /تصحيح|حل نموذجي|الحل/i.test(title) || type === 'correction',
                previewUrl: 'https://drive.google.com/file/d/' + id + '/preview',
                downloadUrl: 'https://drive.google.com/file/d/' + id + '/view?usp=sharing',
                source: 'Google Drive',
                driveFileId: id,
                levelLabel: levelLabel,
                levelCode: levelCode,
                branch: '',
                meta: ['Google Drive', 'PDF'],
                page: '',
                pageTitle: title,
                breadcrumb: [cycleFolder.getName(), levelLabel, subjectFolder.getName(), termFolder.getName(), categoryFolder.getName()]
              });
            }
          }
        }
      }
    }
  }
  resources.sort((a, b) => a.cycleId.localeCompare(b.cycleId) ||
    a.levelLabel.localeCompare(b.levelLabel, 'ar') ||
    a.subject.localeCompare(b.subject, 'ar') ||
    a.semester - b.semester ||
    a.title.localeCompare(b.title, 'ar'));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: 'Google Drive',
    count: resources.length,
    resources: resources
  };
}

function levelCode_(label) {
  const m = label.match(/[0-9٠-٩]+/);
  if (!m) return '';
  return m[0].replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).padStart(2, '0');
}
