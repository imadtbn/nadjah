(() => {
'use strict';
if (window.NadjahSubjectDriveLoaded) return;
window.NadjahSubjectDriveLoaded = true;
const current = document.currentScript;
const base = new URL('../../../', current.src);
const config = new URL('assets/js/google-drive-config.js', base);
const norm = value => String(value || '').toLowerCase().normalize('NFKD')
 .replace(/[\u064B-\u065F\u0670]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي')
 .replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s]/gu,' ')
 .replace(/\s+/g,' ').trim();
const typeLabels = {homework:'فرض',exam:'اختبار',exercise:'تمرين',revision:'مراجعة',lesson:'درس',summary:'ملخص',correction:'تصحيح'};
const levelWords = {'الأولى':'1','الأول':'1','الثانية':'2','الثاني':'2','الثالثة':'3','الثالث':'3','الرابعة':'4','الرابع':'4','الخامسة':'5','الخامس':'5','السادسة':'6','السادس':'6'};
function pageContext(){
 const path = location.pathname;
 const cycleId = /\/levels\/primary\//.test(path) ? 'primary' : /\/levels\/middle\//.test(path) ? 'middle' : /\/levels\/branch\//.test(path) ? 'secondary' : '';
 const title = document.querySelector('.subject-badge span')?.textContent || document.querySelector('.hero-subject-title .highlight')?.textContent || document.title.split('|')[0];
 const levelText = document.querySelector('.hero-subject-title')?.textContent || document.title;
 let levelNumber = '';
 for (const [word,num] of Object.entries(levelWords)) if (norm(levelText).includes(norm(word))) { levelNumber=num; break; }
 const branch = document.querySelector('.branch-badge, [data-branch]')?.textContent || '';
 return {cycleId, subject:norm(title), levelNumber, branch:norm(branch)};
}
function safeLink(value){try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}}
function render(items){
 const ctx=pageContext();
 if(!ctx.cycleId || !ctx.subject) return;
 const filtered=items.filter(i=>{
  if(i.cycleId!==ctx.cycleId || norm(i.subject)!==ctx.subject) return false;
  const label=norm(i.levelLabel || '');
  if(ctx.levelNumber && label && !new RegExp('(^|\\s)'+ctx.levelNumber+'(\\s|$)').test(label.replace(/السنة/g,' '))) {
   const arabicMatch = Object.entries(levelWords).some(([word,num])=>num===ctx.levelNumber && label.includes(norm(word)));
   if(!arabicMatch) return false;
  }
  if(ctx.branch && i.branch && norm(i.branch)!==ctx.branch) return false;
  return true;
 });
 const section=document.querySelector('.documents-section');
 if(!section) return;
 section.querySelectorAll('.semester-content').forEach(panel=>{
  const semester=Number((panel.id.match(/semester-(\d+)/)||[])[1]);
  const grid=panel.querySelector('.documents-grid[id^="latest-documents-"]');
  if(!grid) return;
  const rows=filtered.filter(i=>Number(i.semester||0)===semester);
  grid.innerHTML=rows.length?rows.map(i=>{
   const preview=safeLink(i.previewUrl), download=safeLink(i.downloadUrl);
   const chips=[i.subject,i.levelLabel,'الفصل '+semester,typeLabels[i.type]||'نموذج',i.corrected?'مع التصحيح':'دون تصحيح'].filter(Boolean);
   return '<article class="doc-card" data-resource-id="'+String(i.id||'').replace(/[^a-zA-Z0-9_-]/g,'')+'"><h3>'+escapeHtml(i.title||'موضوع تعليمي')+'</h3><div class="doc-meta">'+chips.map(x=>'<span class="doc-tag">'+escapeHtml(x)+'</span>').join('')+'</div><div class="doc-actions">'+(preview?'<a class="btn-preview" href="'+escapeHtml(preview)+'" target="_blank" rel="noopener"><i class="fas fa-eye" aria-hidden="true"></i> معاينة PDF</a>':'<span class="btn-preview" aria-disabled="true">المعاينة غير متاحة</span>')+(download?'<a class="btn-download" href="'+escapeHtml(download)+'" target="_blank" rel="noopener"><i class="fas fa-download" aria-hidden="true"></i> تحميل PDF</a>':'<span class="btn-download" aria-disabled="true">PDF غير متاح</span>')+'</div></article>';
  }).join(''):'<div class="loading-docs">لا توجد نماذج منشورة لهذا الفصل حاليًا.</div>';
  const tab=section.querySelector('.semester-tab[data-semester="'+semester+'"] .tab-count');
  if(tab) tab.textContent=rows.length+' نموذج';
 });
 const stats=document.querySelector('[data-subject-stat="resources"]');
 if(stats) stats.innerHTML=filtered.length+' <small>نموذج</small>';
 const rate=document.querySelector('[data-subject-stat="correctionRate"]');
 if(rate) rate.innerHTML+(filtered.length?'':'');
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function load(){
 const endpoint=String(window.NADJAH_DRIVE_FEED_URL||'').trim();
 if(!endpoint) return;
 const cb='NadjahSubjectFeed_'+Date.now();
 const tag=document.createElement('script'); let done=false;
 const timer=setTimeout(()=>finish(false),12000);
 function finish(ok,data){if(done)return;done=true;clearTimeout(timer);try{delete window[cb]}catch{}tag.remove();if(ok){const items=Array.isArray(data?.resources)?data.resources:Array.isArray(data?.files)?data.files:[];render(items);}else document.querySelectorAll('.documents-grid[id^="latest-documents-"]').forEach(g=>g.innerHTML='<div class="loading-docs">تعذر تحميل النماذج من المكتبة. يرجى المحاولة لاحقًا.</div>');}
 window[cb]=data=>finish(true,data);
 tag.onerror=()=>finish(false);
 tag.src=endpoint+(endpoint.includes('?')?'&':'?')+'callback='+encodeURIComponent(cb)+'&v='+Date.now();
 document.head.appendChild(tag);
}
const configTag=document.createElement('script');configTag.src=config.href;configTag.onload=load;configTag.onerror=()=>console.error('تعذر تحميل إعداد مكتبة Google Drive');document.head.appendChild(configTag);
})();