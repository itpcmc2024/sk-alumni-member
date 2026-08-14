/*
 SK Alumni Member System V1.0.20 - Hybrid
 IMPORTANT: หลัง Deploy Google Apps Script ให้ใส่ Web App URL ใน API_URL ด้านล่าง
*/
const SK_CONFIG = {
  VERSION: '1.0.20',
  API_URL: 'https://script.google.com/macros/s/AKfycbyvMLHGrhtRsrHJC_A0TRB7-GPmS9FFICHI_Soo6X0qwPYRC7ishqmdA9E9M5G30BVfXQ/exec'
};

const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];

function apiReady(){
  return SK_CONFIG.API_URL && SK_CONFIG.API_URL.startsWith('https://script.google.com/');
}
function setLoading(show){ const el=$('#loading'); if(el) el.classList.toggle('hidden', !show); }
function ensureUiModal(){
  let el=document.querySelector('#skUiModal');
  if(el) return el;
  el=document.createElement('div');
  el.id='skUiModal';
  el.className='sk-modal hidden';
  el.innerHTML=`
    <div class="sk-modal-backdrop"></div>
    <div class="sk-modal-card" role="dialog" aria-modal="true">
      <div class="sk-modal-icon">✓</div>
      <h3 class="sk-modal-title"></h3>
      <div class="sk-modal-message"></div>
      <div class="sk-modal-actions">
        <button class="btn btn-ghost sk-modal-cancel hidden" type="button">ยกเลิก</button>
        <button class="btn btn-primary sk-modal-ok" type="button">ตกลง</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  return el;
}

function uiAlert(title,message,type='success'){
  const el=ensureUiModal();
  const icon=el.querySelector('.sk-modal-icon');
  icon.textContent=type==='error'?'!':type==='warning'?'⚠':'✓';
  icon.className='sk-modal-icon '+type;
  el.querySelector('.sk-modal-title').textContent=title||'แจ้งเตือน';
  el.querySelector('.sk-modal-message').innerHTML=escapeHtml(String(message||'')).replace(/\n/g,'<br>');
  el.querySelector('.sk-modal-cancel').classList.add('hidden');
  el.classList.remove('hidden');
  return new Promise(resolve=>{
    const ok=el.querySelector('.sk-modal-ok');
    const close=()=>{el.classList.add('hidden');ok.onclick=null;resolve(true);};
    ok.onclick=close;
    el.querySelector('.sk-modal-backdrop').onclick=close;
  });
}

function uiConfirm(title,message){
  const el=ensureUiModal();
  const icon=el.querySelector('.sk-modal-icon');
  icon.textContent='?'; icon.className='sk-modal-icon warning';
  el.querySelector('.sk-modal-title').textContent=title||'ยืนยันรายการ';
  el.querySelector('.sk-modal-message').innerHTML=escapeHtml(String(message||'')).replace(/\n/g,'<br>');
  const cancel=el.querySelector('.sk-modal-cancel'), ok=el.querySelector('.sk-modal-ok');
  cancel.classList.remove('hidden');
  el.classList.remove('hidden');
  return new Promise(resolve=>{
    const close=(value)=>{el.classList.add('hidden');ok.onclick=null;cancel.onclick=null;resolve(value);};
    ok.onclick=()=>close(true); cancel.onclick=()=>close(false);
    el.querySelector('.sk-modal-backdrop').onclick=()=>close(false);
  });
}

function toast(msg,type='ok'){
  return uiAlert(type==='error'?'เกิดข้อผิดพลาด':'แจ้งเตือน',msg,type==='error'?'error':'success');
}
async function api(action, payload={}){
  if(!apiReady()) throw new Error('ยังไม่ได้กำหนด GAS Web App URL ใน assets/js/app.js');
  const body = new URLSearchParams();
  body.set('action', action);
  body.set('payload', JSON.stringify(payload));
  const res = await fetch(SK_CONFIG.API_URL, {method:'POST', body});
  const text = await res.text();
  let data; try{ data=JSON.parse(text); }catch(e){ throw new Error('API ตอบกลับไม่ถูกต้อง: '+text.slice(0,150)); }
  if(!data.ok) throw new Error(data.message || 'เกิดข้อผิดพลาดจากระบบ');
  return data;
}
function statusClass(status){
  if(status==='สมาชิกสมบูรณ์')return 'active';
  if(status==='ไม่อนุมัติ')return 'rejected';
  if(status==='รอตรวจสอบการชำระ')return 'payment-pending';
  if(status==='รอชำระค่าสมาชิก')return 'payment-due';
  return 'pending';
}
function formatDate(v){
  if(!v) return '-';
  const d=new Date(v); if(Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short'}).format(d);
}
function escapeHtml(v=''){
  return String(v).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
async function fileToDataUrl(file){
  if(!file)return '';
  if(file.size>8*1024*1024)throw new Error('ไฟล์ต้นฉบับมีขนาดเกิน 8 MB กรุณาเลือกรูปที่เล็กลง');
  if(!String(file.type||'').startsWith('image/'))throw new Error('รองรับเฉพาะไฟล์รูปภาพ');
  const raw=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));r.readAsDataURL(file);});
  const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('เปิดไฟล์รูปไม่สำเร็จ'));img.src=raw;});
  const maxSide=1400,scale=Math.min(1,maxSide/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));c.height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  let q=.84,out=c.toDataURL('image/jpeg',q);while(out.length>1.65*1024*1024&&q>.58){q-=.07;out=c.toDataURL('image/jpeg',q);}return out;
}

document.addEventListener('DOMContentLoaded', ()=>{
  if($('#registerForm')) initRegistration();
  if($('#statusForm')) initStatusCheck();
  if($('#newsList')) loadNews();
  document.querySelectorAll('[data-open-news-center]').forEach(a=>a.addEventListener('click',e=>{if(location.pathname.endsWith('index.html')||location.pathname.endsWith('/')){e.preventDefault();const list=window.SK_PUBLIC_NEWS||[];if(list.length)openNewsCenter(list);else location.hash='news-center';}}));
  if($('#homeStatTotal')) loadPublicStats();
  loadPublicHomeContent();
});

function initRegistration(){
  let step=1;const form=$('#registerForm'),prev=$('#prevBtn'),next=$('#nextBtn'),submit=$('#submitBtn'),consent=form.querySelector('input[name="consent"]'),photo=$('#photoInput'),prefix=form.elements.prefix,prefixOther=$('#prefixOtherInput'),prefixOtherWrap=$('#prefixOtherWrap');
  function syncPrefixOther(){const other=prefix?.value==='อื่นๆ';prefixOtherWrap?.classList.toggle('hidden',!other);if(prefixOther){prefixOther.required=other;if(!other)prefixOther.value='';}}
  prefix?.addEventListener('change',syncPrefixOther);syncPrefixOther();
  function syncSubmitButton(){if(!submit)return;const ready=!!consent?.checked&&!!photo?.files?.length;submit.disabled=!ready;submit.classList.toggle('is-disabled',!ready);submit.setAttribute('aria-disabled',String(!ready));}
  consent?.addEventListener('change',syncSubmitButton);photo?.addEventListener('change',async()=>{if(photo.files?.[0]?.size>8*1024*1024){photo.value='';await uiAlert('รูปมีขนาดใหญ่เกินไป','กรุณาเลือกรูปต้นฉบับไม่เกิน 8 MB ระบบจะย่อรูปให้อัตโนมัติ','warning');}syncSubmitButton();});syncSubmitButton();
  function paint(){$$('.form-step').forEach(x=>x.classList.toggle('active',Number(x.dataset.step)===step));$$('[data-step-indicator]').forEach(x=>x.classList.toggle('active',Number(x.dataset.stepIndicator)===step));prev.hidden=step===1;next.hidden=step>=3;submit.hidden=step!==3;next.classList.toggle('hidden',step>=3);submit.classList.toggle('hidden',step!==3);syncSubmitButton();}
  async function validateCurrent(){const panel=$(`.form-step[data-step="${step}"]`);if(step===3&&!photo?.files?.length){await uiAlert('ยังไม่มีรูปถ่าย','กรุณาแนบรูปถ่ายก่อนยืนยันการลงทะเบียน','warning');return false;}for(const f of $$('input,select,textarea',panel)){if(!f.checkValidity()){const label=f.closest('label'),fieldName=(label?.childNodes?.[0]?.textContent||f.name||'ข้อมูล').trim();let msg=`กรุณาตรวจสอบช่อง “${fieldName}”`;if(f.validity.valueMissing)msg=`กรุณากรอก/เลือก “${fieldName}”`;else if(f.validity.typeMismatch)msg=`รูปแบบ “${fieldName}” ไม่ถูกต้อง`;await uiAlert('ข้อมูลยังไม่ครบ',msg,'warning');f.focus();return false;}}return true;}
  next.addEventListener('click',async()=>{if(await validateCurrent()){step=Math.min(3,step+1);paint();window.scrollTo({top:$('#register')?.offsetTop-90||0,behavior:'smooth'});}});
  prev.addEventListener('click',()=>{step=Math.max(1,step-1);paint();});
  form.addEventListener('submit',async e=>{e.preventDefault();if(!(await validateCurrent()))return;try{setLoading(true);const fd=new FormData(form),payload=Object.fromEntries(fd.entries());delete payload.photo;if(payload.prefix==='อื่นๆ')payload.prefix=String(payload.prefixOther||'').trim();delete payload.prefixOther;if(!payload.prefix)throw new Error('กรุณากรอกคำนำหน้า');const file=photo.files[0];payload.photoDataUrl=await fileToDataUrl(file);payload.photoName=file.name;const out=await api('registerMember',payload);const address=[payload.houseNo,payload.moo?`หมู่ ${payload.moo}`:'',payload.soi?`ซอย ${payload.soi}`:'',payload.road?`ถนน ${payload.road}`:'',payload.subdistrict?`ตำบล/แขวง ${payload.subdistrict}`:'',payload.district?`อำเภอ/เขต ${payload.district}`:'',payload.province?`จังหวัด ${payload.province}`:'',payload.postalCode].filter(Boolean).join(' ');const receipt={memberCode:out.member.memberCode,status:out.member.status,fullName:payload.fullName,prefix:payload.prefix,arabicName:payload.arabicName||'',email:payload.email,phone:payload.phone||'',photoDataUrl:payload.photoDataUrl,registeredAt:out.member.registeredAt,address};sessionStorage.setItem('skLastRegistration',JSON.stringify(receipt));form.reset();step=1;syncPrefixOther();paint();syncSubmitButton();await showRegistrationPaymentStep(out.member);}catch(err){toast(err.message,'error');}finally{setLoading(false);}});
}

async function getRegistrationConfig(){try{return await api('publicRegistrationConfig',{});}catch(e){return {fee:0,promptPay:'',topicId:'PAY-TOPIC-001'};}}
function buildPromptPayPayload(target,amount){const digits=String(target||'').replace(/\D/g,'');if(!digits)return '';const fmt=(id,val)=>id+String(val.length).padStart(2,'0')+val;let proxy='';if(digits.length===10)proxy=fmt('01','0066'+digits.slice(1));else if(digits.length===13)proxy=fmt('02',digits);else return '';const merchant=fmt('00','A000000677010111')+proxy;let payload=fmt('00','01')+fmt('01','12')+fmt('29',merchant)+fmt('58','TH')+fmt('53','764');if(Number(amount)>0)payload+=fmt('54',Number(amount).toFixed(2));payload+=fmt('62',fmt('07','SKALUMNI'))+'6304';return payload+crc16PromptPay(payload);}
function crc16PromptPay(str){let crc=0xFFFF;for(let i=0;i<str.length;i++){crc^=str.charCodeAt(i)<<8;for(let j=0;j<8;j++){crc=(crc&0x8000)?((crc<<1)^0x1021):(crc<<1);crc&=0xFFFF;}}return crc.toString(16).toUpperCase().padStart(4,'0');}
function dynamicQrUrl(payload){return payload?`https://quickchart.io/qr?size=360&margin=1&text=${encodeURIComponent(payload)}`:'';}
async function showRegistrationPaymentStep(member){const cfg=await getRegistrationConfig(),fee=Number(cfg.fee||0),payload=buildPromptPayPayload(cfg.promptPay,fee),qr=dynamicQrUrl(payload)||'assets/img/membership-payment-qr.jpg';let modal=$('#registrationPaymentModal');if(!modal){modal=document.createElement('div');modal.id='registrationPaymentModal';modal.className='member-detail-modal hidden';document.body.appendChild(modal);}modal.innerHTML=`<div class="member-detail-backdrop"></div><div class="member-detail-card registration-payment-card"><div class="member-detail-head"><div><span class="eyebrow">STEP 3 • PAYMENT</span><h2>ชำระค่าสมาชิก</h2></div></div><div class="registration-payment-body"><div class="registration-temp-code"><small>รหัสสมาชิกชั่วคราว</small><strong>${escapeHtml(member.memberCode)}</strong><span>${escapeHtml(member.fullName||'')}</span></div><div class="registration-qr-box"><img src="${qr}" alt="QR ชำระค่าสมาชิก"><div><small>ค่าสมาชิกตามการตั้งค่าระบบ</small><strong>${fee>0?fee.toLocaleString('th-TH')+' บาท':'ตรวจสอบยอดในหน้าชำระ'}</strong>${payload?'<span class="qr-lock-note">✓ QR นี้กำหนดยอดอัตโนมัติ</span>':'<span class="qr-lock-note muted">QR สำรอง - กรุณาตรวจสอบยอดก่อนโอน</span>'}</div></div><div class="registration-message">หลังจากสนับสนุนค่าสมาชิกแล้ว คุณสามารถดาวน์โหลดหลักฐานการเป็นสมาชิกศิษย์เก่าฯ และเข้าร่วมสิทธิประโยชน์อื่นๆ ได้ค่ะ</div></div><div class="member-detail-actions registration-payment-actions"><button class="btn btn-ghost" type="button" id="payLaterBtn">ชำระภายหลัง</button><button class="btn btn-primary" type="button" id="payNowBtn">แจ้งชำระค่าสมาชิก</button></div></div>`;modal.classList.remove('hidden');$('#payNowBtn').onclick=()=>{location.href=`payment.html?memberCode=${encodeURIComponent(member.memberCode)}&from=register`;};$('#payLaterBtn').onclick=async()=>{modal.classList.add('hidden');await uiAlert('บันทึกรหัสสมาชิกชั่วคราวแล้ว',`รหัสสมาชิกชั่วคราวของคุณคือ ${member.memberCode}\n\nหลังจากสนับสนุนค่าสมาชิกแล้ว คุณสามารถดาวน์โหลดหลักฐานการเป็นสมาชิกศิษย์เก่าฯ และเข้าร่วมสิทธิประโยชน์อื่นๆ ได้ค่ะ`,'success');location.href=`status.html?memberCode=${encodeURIComponent(member.memberCode)}`;};}

function initStatusCheck(){
 const params=new URLSearchParams(location.search),preset=params.get('memberCode');if(preset&&$('#statusQuery'))$('#statusQuery').value=preset;
 $('#statusForm').addEventListener('submit',async e=>{e.preventDefault();const query=$('#statusQuery').value.trim();if(!query)return;try{setLoading(true);const out=await api('checkStatus',{query}),m=out.member,cls=statusClass(m.status);$('#statusResult').innerHTML=`<div class="status-card status-card-${cls||'pending'}"><div class="status-result-top"><span class="status-badge ${cls}">${escapeHtml(m.status)}</span><strong>${escapeHtml(m.memberCode)}</strong></div><h4>${escapeHtml(m.fullName)}</h4><p>วันที่ลงทะเบียน: ${escapeHtml(formatDate(m.registeredAt))}</p>${m.status==='สมาชิกสมบูรณ์'?'<div class="status-success-note">✓ ยืนยันสมาชิกสมบูรณ์แล้ว สามารถเข้าสู่ข้อมูลสมาชิกและใช้สิทธิประโยชน์ได้</div>':''}</div>`;}catch(err){$('#statusResult').innerHTML='';toast(err.message,'error');}finally{setLoading(false);}});
 if(preset)$('#statusForm').requestSubmit();
}
async function loadNews(){
  if(!apiReady()) return;
  try{
    const out=await api('publicNews',{});
    const list=out.news||[];
    window.SK_PUBLIC_NEWS=list;
    renderHomeNews(list);
    if(location.hash==='#news-center')openNewsCenter(list);
    const btn=$('#showAllNewsBtn');
    if(btn){
      btn.onclick=()=>openNewsCenter(list);
      btn.classList.toggle('hidden',list.length===0);
    }
  }catch(e){
    console.warn(e);
    if($('#newsList')) $('#newsList').innerHTML='<div class="news-empty">ยังไม่สามารถโหลดข่าวสารได้</div>';
  }
}
function renderHomeNews(list){
  const host=$('#newsList'); if(!host)return;
  if(!list.length){host.innerHTML='<div class="news-empty">ยังไม่มีข่าวสาร</div>';return;}
  host.innerHTML=list.slice(0,8).map((n,i)=>{
    const cat=newsCategoryClass(n.category);
    const firstImg=newsImages(n)[0]||'';const thumb=firstImg?`<img src="${escapeHtml(firstImg)}" alt="" loading="lazy">`:newsEmoji(n.category);
    return `<button class="home-news-item home-news-clickable" type="button" data-home-news-index="${i}">
      <div class="news-thumb ${cat}">${thumb}</div>
      <div class="home-news-copy">
        <div class="news-meta"><span class="${cat}">${escapeHtml(n.category||'ข่าวสาร')}</span>${n.publishDate?`<time>${escapeHtml(formatShortDate(n.publishDate))}</time>`:''}</div>
        <h4>${escapeHtml(n.title||'')}</h4>
        <p>${escapeHtml(String(n.content||'').slice(0,92))}${String(n.content||'').length>92?'…':''}</p>
      </div>
      <span class="news-arrow">›</span>
    </button>`;
  }).join('');
  host.querySelectorAll('[data-home-news-index]').forEach(btn=>{
    btn.onclick=()=>openNewsPopup(list[Number(btn.dataset.homeNewsIndex)]);
  });
}
function newsCategoryClass(category){
  const c=String(category||'').trim();
  if(c==='กิจกรรม')return 'cat-activity';
  if(c==='ประกาศ')return 'cat-announce';
  return 'cat-news';
}
function newsEmoji(category){
  const c=String(category||'');
  if(c.includes('กิจกรรม')) return '🎉';
  if(c.includes('ประกาศ')) return '📌';
  return '📰';
}
function formatShortDate(v){
  const d=new Date(v); if(Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric'}).format(d);
}
function openNewsDetail(json){
  let n={};try{n=JSON.parse(json);}catch(_){}
  openNewsPopup(n);
}
function openAllNews(list){
  const modal=ensureUiModal();
  const icon=modal.querySelector('.sk-modal-icon');
  icon.textContent='📰'; icon.className='sk-modal-icon';
  modal.querySelector('.sk-modal-title').textContent='ข่าวสารทั้งหมด';
  modal.querySelector('.sk-modal-message').innerHTML=`<div class="all-news-modal">${
    (list||[]).map(n=>`<button class="all-news-row" type="button" onclick='openNewsDetail(${JSON.stringify(JSON.stringify(n))})'>
      <b>${escapeHtml(n.title||'')}</b><span>${escapeHtml(n.category||'ข่าวสาร')}</span>
    </button>`).join('') || '<div class="news-empty">ยังไม่มีข่าวสาร</div>'
  }</div>`;
  modal.querySelector('.sk-modal-cancel').classList.add('hidden');
  modal.classList.remove('hidden');
  const ok=modal.querySelector('.sk-modal-ok');
  ok.onclick=()=>{modal.classList.add('hidden');ok.onclick=null;};
}

async function loadPublicStats(){
  if(!apiReady())return;
  try{
    const o=await api('publicStats',{}),s=o.stats||{};
    $('#homeStatTotal').textContent=Number(s.total||0).toLocaleString('th-TH');
    $('#homeStatYear').textContent=Number(s.thisYear||0).toLocaleString('th-TH');
    $('#homeStatNew').textContent=Number(s.newThisMonth||0).toLocaleString('th-TH');
    $('#homeStatActivities').textContent=Number(s.activitiesThisYear||0).toLocaleString('th-TH');
  }catch(e){console.warn(e)}
}


async function loadPublicHomeContent(){
  if(!apiReady())return;
  try{
    const o=await api('publicHomeContent',{}),c=o.content||{};
    if($('#homeHeroChip'))$('#homeHeroChip').textContent=c.heroChip||'สมาคมศิษย์เก่า';
    if($('#homeHeroTitle'))$('#homeHeroTitle').textContent=c.heroTitle||'นูรุ้ลอิสลามสัมพันธ์';
    if($('#homeHeroSub'))$('#homeHeroSub').innerHTML=escapeHtml(c.heroSub||'نور الإسلام · Nurul Islam　(สุเหร่าเขียว)').replace(/\\n/g,'<br>');
    if($('#homeHeroQuote'))$('#homeHeroQuote').textContent=c.heroQuote||'⭐ “ศิษย์เก่าคือครอบครัว ❤️ ร่วมกันพัฒนา สานสัมพันธ์ สู่อนาคตที่ดี”';
    if($('#homeQuoteText'))$('#homeQuoteText').innerHTML=escapeHtml(c.quoteText||'เรามาไกลเพราะการศึกษา\\nเราจะไปได้ไกลกว่า\\nเพราะความร่วมมือของเรา').replace(/\\n/g,'<br>');
  }catch(e){console.warn(e)}
}
function openNewsCenter(list,selected){
  const frame=$('#newsCenter');if(!frame)return;
  frame.classList.remove('hidden');
  $('#homeDashboardRow')?.classList.add('hidden');frame.scrollIntoView({behavior:'smooth',block:'start'});
  const rows=list||[],host=$('#newsCenterList');
  host.innerHTML=rows.length?rows.map((n,i)=>`<button class="news-center-row" type="button" data-news-index="${i}">
    <div class="news-center-thumb ${newsCategoryClass(n.category)}">${n.imageUrl?`<img src="${escapeHtml(n.imageUrl)}" alt="" loading="lazy">`:newsEmoji(n.category)}</div>
    <div><div class="news-meta"><span class="${newsCategoryClass(n.category)}">${escapeHtml(n.category||'ข่าวสาร')}</span>${n.publishDate?`<time>${escapeHtml(formatShortDate(n.publishDate))}</time>`:''}</div><b>${escapeHtml(n.title||'')}</b><small>${escapeHtml(String(n.content||'').slice(0,90))}${String(n.content||'').length>90?'…':''}</small></div>
  </button>`).join(''):'<div class="news-empty">ยังไม่มีข่าวสาร</div>';
  host.querySelectorAll('.news-center-row').forEach(btn=>btn.onclick=()=>renderNewsCenterDetail(rows[Number(btn.dataset.newsIndex)]));
  if(selected)renderNewsCenterDetail(selected);else if(rows[0])renderNewsCenterDetail(rows[0]);
}
function renderNewsCenterDetail(n){
  const host=$('#newsCenterDetail');if(!host||!n)return;
  const imgs=newsImages(n);
  host.innerHTML=`${imgs.length?`<div class="news-detail-gallery">${imgs.map((u,i)=>`<button type="button" data-detail-gallery-index="${i}"><img src="${escapeHtml(u)}" alt=""></button>`).join('')}</div>`:''}<div class="news-detail-meta"><span class="${newsCategoryClass(n.category)}">${escapeHtml(n.category||'ข่าวสาร')}</span>${n.publishDate?`<time>${escapeHtml(formatShortDate(n.publishDate))}</time>`:''}</div><h2>${escapeHtml(n.title||'')}</h2><div class="news-detail-content">${escapeHtml(n.content||'').replace(/\\n/g,'<br>')}</div>`;
  host.querySelectorAll('[data-detail-gallery-index]').forEach(btn=>btn.onclick=()=>openImageLightbox(imgs[Number(btn.dataset.detailGalleryIndex)],imgs,n.title||''));
}
document.addEventListener('DOMContentLoaded',()=>{$('#closeNewsCenterBtn')?.addEventListener('click',()=>{$('#newsCenter')?.classList.add('hidden');$('#homeDashboardRow')?.classList.remove('hidden');});});


function openNewsPopup(n){
  const modal=$('#newsPopupModal'),body=$('#newsPopupBody');if(!modal||!body||!n)return;
  $('#newsPopupTitle').textContent=n.title||'ข่าวสาร';
  const cat=newsCategoryClass(n.category),imgs=newsImages(n);
  body.innerHTML=`<div class="news-popup-meta"><span class="${cat}">${escapeHtml(n.category||'ข่าวสาร')}</span>${n.publishDate?`<time>${escapeHtml(formatShortDate(n.publishDate))}</time>`:''}</div>
    ${imgs.length?`<div class="news-popup-gallery">${imgs.map((u,i)=>`<button type="button" data-gallery-index="${i}"><img src="${escapeHtml(u)}" alt="รูปข่าว ${i+1}"></button>`).join('')}</div>`:''}
    <div class="news-popup-content">${escapeHtml(n.content||'').replace(/\n/g,'<br>')}</div>`;
  body.querySelectorAll('[data-gallery-index]').forEach(btn=>btn.onclick=()=>openImageLightbox(imgs[Number(btn.dataset.galleryIndex)],imgs,n.title||''));
  modal.classList.remove('hidden');
}
let imageGalleryItems=[],imageGalleryIndex=0,imageGalleryCaption='';
function openImageLightbox(url,items,caption){
  const list=(Array.isArray(items)&&items.length?items:[url]).filter(Boolean);
  if(!list.length)return;
  imageGalleryItems=list;imageGalleryIndex=Math.max(0,list.indexOf(url));imageGalleryCaption=caption||'';
  renderImageLightbox();
  $('#imageLightbox')?.classList.remove('hidden');
  document.body.classList.add('lightbox-open');
}
function renderImageLightbox(){
  const img=$('#imageLightboxImg'),counter=$('#imageLightboxCounter'),caption=$('#imageLightboxCaption'),prev=$('#imageLightboxPrev'),next=$('#imageLightboxNext');
  if(!img||!imageGalleryItems.length)return;
  img.src=imageGalleryItems[imageGalleryIndex];
  if(counter)counter.textContent=imageGalleryItems.length>1?`${imageGalleryIndex+1} / ${imageGalleryItems.length}`:'';
  if(caption)caption.textContent=imageGalleryCaption||'';
  if(prev)prev.disabled=imageGalleryItems.length<=1;
  if(next)next.disabled=imageGalleryItems.length<=1;
}
function moveImageLightbox(step){
  if(imageGalleryItems.length<=1)return;
  imageGalleryIndex=(imageGalleryIndex+step+imageGalleryItems.length)%imageGalleryItems.length;
  renderImageLightbox();
}
function closeImageLightbox(){
  $('#imageLightbox')?.classList.add('hidden');document.body.classList.remove('lightbox-open');
  const img=$('#imageLightboxImg');if(img)img.removeAttribute('src');
}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-open-news-center]').forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();openNewsCenter(window.SK_PUBLIC_NEWS||[]);
  }));
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-close-news-popup]'))$('#newsPopupModal')?.classList.add('hidden');
    if(e.target.closest('[data-close-image-lightbox]'))$('#imageLightbox')?.classList.add('hidden');
  });
});

function newsImages(n){const a=Array.isArray(n?.images)?n.images.filter(Boolean):[];if(!a.length&&n?.imageUrl)a.push(n.imageUrl);return a;}


document.addEventListener('click',e=>{
  if(e.target.closest('[data-close-image-lightbox]'))closeImageLightbox();
  if(e.target.closest('#imageLightboxPrev'))moveImageLightbox(-1);
  if(e.target.closest('#imageLightboxNext'))moveImageLightbox(1);
});
document.addEventListener('keydown',e=>{
  if($('#imageLightbox')?.classList.contains('hidden'))return;
  if(e.key==='ArrowLeft')moveImageLightbox(-1);
  else if(e.key==='ArrowRight')moveImageLightbox(1);
  else if(e.key==='Escape')closeImageLightbox();
});
