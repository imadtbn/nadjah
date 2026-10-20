(() => {
'use strict';
if (window.NadjahPdfLibraryLoaded) return;
window.NadjahPdfLibraryLoaded = true;
const script = document.currentScript;
const root = new URL('../../', script.src);
const labels = {primary:'الطور الابتدائي',middle:'الطور المتوسط',secondary:'الطور الثانوي'};
const types = {homework:'فرض',exam:'اختبار',exercise:'تمرين',revision:'مراجعة'};
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
function validHttp(value){try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:';}catch(e){return false;}}
function uniqueUrls(items,key){const counts=new Map();items.forEach(item=>{if(!validHttp(item[key]))return;const u=new URL(item[key]).href;counts.set(u,(counts.get(u)||0)+1);});return new Set(Array.from(counts.entries()).filter(e=>e[1]===1).map(e=>e[0]));}
function safeUrl(value,set){if(!validHttp(value))return null;const u=new URL(value).href;return set.has(u)?u:null;}
function dlUrl(value){try{const u=new URL(value);if(u.hostname==='drive.google.com'){const m=u.pathname.match(/\/file\/d\/([^/]+)/);if(m)return 'https://drive.google.com/uc?export=download&id='+encodeURIComponent(m[1]);}return u.href;}catch(e){return value;}}
function pageUrl(item){return new URL('resources/'+encodeURIComponent(item.id)+'.html',root).href;}
function addStyles(){if(document.querySelector('link[data-library-downloads]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('assets/css/library-downloads.css',root).href;link.dataset.libraryDownloads='true';document.head.appendChild(link);}
function chips(item){return [item.subject,labels[item.cycleId]||item.cycleId,item.levelLabel,item.branch,item.semester?'الفصل '+item.semester:'',types[item.type]||'نموذج',item.corrected?'مع التصحيح':'دون تصحيح'].filter(Boolean).map(v=>'<span class="library-chip">'+esc(v)+'</span>').join('');}
function home(items,previews,downloads){
 const grid=document.querySelector('.resources-section .resources-grid');if(!grid)return;
 const section=grid.closest('.resources-section');const desc=section.querySelector('.section-header p');
 if(desc)desc.textContent='اختر الطور والمادة ونوع الموضوع للوصول إلى النماذج المنشورة ومعاينة ملفات PDF أو تحميلها عند توفر رابط صالح.';
 const subjects=Array.from(new Set(items.map(i=>i.subject).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'ar'));
 const toolbar=document.createElement('div');toolbar.className='library-toolbar';
 toolbar.innerHTML='<input class="library-control" type="search" data-lib-q placeholder="ابحث عن موضوع..." aria-label="البحث في النماذج"><select class="library-control" data-lib-cycle aria-label="الطور"><option value="">كل الأطوار</option><option value="primary">الابتدائي</option><option value="middle">المتوسط</option><option value="secondary">الثانوي</option></select><select class="library-control" data-lib-subject aria-label="المادة"><option value="">كل المواد</option>'+subjects.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('')+'</select><select class="library-control" data-lib-type aria-label="نوع الموضوع"><option value="">كل الأنواع</option><option value="homework">الفروض</option><option value="exam">الاختبارات</option><option value="exercise">التمارين</option><option value="revision">المراجعة</option></select>';
 section.insertBefore(toolbar,grid);const note=document.createElement('p');note.className='library-results-note';note.setAttribute('aria-live','polite');section.insertBefore(note,grid);
 const wrap=document.createElement('div');wrap.className='library-more-wrap';const more=document.createElement('button');more.type='button';more.className='library-action';more.textContent='عرض المزيد';wrap.appendChild(more);section.appendChild(wrap);let limit=12;
 function render(){const q=norm(toolbar.querySelector('[data-lib-q]').value),cycle=toolbar.querySelector('[data-lib-cycle]').value,subject=toolbar.querySelector('[data-lib-subject]').value,type=toolbar.querySelector('[data-lib-type]').value;
 const filtered=items.filter(i=>{const text=norm([i.title,i.subject,i.type,i.levelLabel,i.branch,i.semester?'الفصل '+i.semester:'',labels[i.cycleId]||'',...(i.breadcrumb||[]),...(i.meta||[])].join(' '));return(!q||text.includes(q))&&(!cycle||i.cycleId===cycle)&&(!subject||i.subject===subject)&&(!type||i.type===type);});
 const shown=filtered.slice(0,limit);note.textContent='عرض '+shown.length+' من أصل '+filtered.length+' موضوعًا مطابقًا.';
 grid.innerHTML=shown.map(i=>{const p=safeUrl(i.previewUrl,previews),d=safeUrl(i.downloadUrl,downloads);return '<article class="library-resource-card"><h3>'+esc(i.title||'موضوع تعليمي')+'</h3><div class="library-resource-meta">'+chips(i)+'</div><div class="library-card-actions"><a class="library-action" href="'+esc(pageUrl(i))+'"><i class="fas fa-circle-info" aria-hidden="true"></i> التفاصيل</a>'+(p?'<a class="library-action" href="'+esc(p)+'" target="_blank" rel="noopener"><i class="fas fa-eye" aria-hidden="true"></i> معاينة PDF</a>':'<span class="library-action" aria-disabled="true" title="لا يوجد رابط معاينة مستقل صالح"><i class="fas fa-eye" aria-hidden="true"></i> المعاينة غير متاحة</span>')+(d?'<a class="library-action primary" href="'+esc(dlUrl(d))+'" target="_blank" rel="noopener"><i class="fas fa-download" aria-hidden="true"></i> تحميل PDF</a>':'<span class="library-action primary" aria-disabled="true" title="يحتاج الموضوع إلى رابط PDF مستقل صالح"><i class="fas fa-download" aria-hidden="true"></i> PDF غير متاح حاليًا</span>')+'</div></article>';}).join('');
 if(!shown.length)grid.innerHTML='<div class="library-empty">لا توجد مواضيع تطابق البحث. جرّب تغيير الطور أو المادة أو نوع الموضوع.</div>';wrap.hidden=filtered.length<=shown.length;}
 toolbar.querySelectorAll('input,select').forEach(c=>c.addEventListener('input',()=>{limit=12;render();}));more.addEventListener('click',()=>{limit+=12;render();});render();
}
function detail(items,previews,downloads){const main=document.querySelector('main[data-resource-id]');if(!main)return;const item=items.find(i=>i.id===main.dataset.resourceId);if(!item)return;const p=safeUrl(item.previewUrl,previews),d=safeUrl(item.downloadUrl,downloads),actions=main.querySelector('.resource-actions');
 if(actions){const a=actions.querySelector('a.resource-action.primary');if(a){if(d){a.href=dlUrl(d);a.removeAttribute('aria-disabled');a.title='تحميل ملف PDF لهذا الموضوع';a.rel='noopener';}else{a.removeAttribute('href');a.removeAttribute('target');a.setAttribute('aria-disabled','true');a.title='لم يُربط بهذا الموضوع ملف PDF مستقل صالح بعد';a.innerHTML='<i class="fas fa-download" aria-hidden="true"></i> ملف PDF غير متاح حاليًا';}}
 const pa=actions.querySelector('a[href*="/preview"]');if(pa&&!p){pa.removeAttribute('href');pa.removeAttribute('target');pa.setAttribute('aria-disabled','true');pa.innerHTML='<i class="fas fa-eye" aria-hidden="true"></i> المعاينة غير متاحة حاليًا';}else if(pa&&p){pa.href=p;pa.target='_blank';pa.rel='noopener';}}
 const frame=main.querySelector('.resource-preview-frame iframe');if(frame&&!p){const wrap=frame.closest('.resource-preview-frame');if(wrap)wrap.innerHTML='<p class="resource-file-notice">لا تتوفر معاينة PDF صالحة لهذا الموضوع حاليًا. ستظهر المعاينة عند إضافة رابط مستقل إلى فهرس المكتبة.</p>';}else if(frame&&p){frame.src=p;}
}
function renderData(data){
 const items=Array.isArray(data&&data.resources)?data.resources:[];
 if(!items.length)return false;
 addStyles();
 home(items,uniqueUrls(items,'previewUrl'),uniqueUrls(items,'downloadUrl'));
 detail(items,uniqueUrls(items,'previewUrl'),uniqueUrls(items,'downloadUrl'));
 return true;
}
function loadLocal(){
 return fetch(new URL('assets/data/resources.json',root).href,{cache:'no-cache'})
  .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
  .then(data=>{if(!renderData(data))throw new Error('الفهرس المحلي فارغ');})
  .catch(e=>console.warn('تعذر تحميل فهرس الموارد المحلي:',e));
}
function loadDrive(){
 const endpoint=String(window.NADJAH_DRIVE_FEED_URL||'').trim();
 if(!endpoint||!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec(?:\?.*)?$/.test(endpoint))return loadLocal();
 return new Promise(resolve=>{
  const callback='NadjahDriveFeed_'+Date.now();
  const tag=document.createElement('script');
  let settled=false;
  let timer;
  const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);try{delete window[callback];}catch(e){window[callback]=undefined;}tag.remove();};
  const fallback=()=>{finish();loadLocal().then(resolve);};
  timer=setTimeout(fallback,12000);
  window[callback]=data=>{
   if(settled)return;
   if(!renderData(data)){fallback();return;}
   finish();resolve();
  };
  tag.onerror=fallback;
  tag.src=endpoint+(endpoint.includes('?')?'&':'?')+'callback='+encodeURIComponent(callback)+'&v='+Date.now();
  document.head.appendChild(tag);
 });
}
loadDrive().catch(e=>console.warn('تعذر تهيئة مكتبة PDF:',e));
})();