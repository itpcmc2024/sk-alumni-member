/*
 SK Alumni Member System V1.0.9 - Hybrid
 IMPORTANT: หลัง Deploy Google Apps Script ให้ใส่ Web App URL ใน API_URL ด้านล่าง
*/
const SK_CONFIG = {
  VERSION: '1.0.9',
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
  if(status==='สมาชิกสมบูรณ์') return 'active';
  if(status==='ไม่อนุมัติ') return 'rejected';
  return '';
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
  if(!file) return '';
  if(file.size > 3*1024*1024) throw new Error('รูปถ่ายต้องมีขนาดไม่เกิน 3 MB');
  return new Promise((resolve,reject)=>{
    const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(new Error('อ่านไฟล์รูปไม่สำเร็จ')); r.readAsDataURL(file);
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  if($('#registerForm')) initRegistration();
  if($('#statusForm')) initStatusCheck();
  if($('#newsList')) loadNews();
  if($('#homeStatTotal')) loadPublicStats();
});

function initRegistration(){
  let step=1;
  const form=$('#registerForm'), prev=$('#prevBtn'), next=$('#nextBtn'), submit=$('#submitBtn');
  const consent=form.querySelector('input[name="consent"]');
  function syncConsentButton(){
    if(!submit) return;
    const checked=!!consent?.checked;
    submit.disabled=!checked;
    submit.classList.toggle('is-disabled',!checked);
    submit.setAttribute('aria-disabled',String(!checked));
  }
  consent?.addEventListener('change',syncConsentButton);
  syncConsentButton();
  function paint(){
    $$('.form-step').forEach(x=>x.classList.toggle('active', Number(x.dataset.step)===step));
    $$('[data-step-indicator]').forEach(x=>x.classList.toggle('active', Number(x.dataset.stepIndicator)===step));
    prev.hidden=step===1;
    next.hidden=step>=3;
    submit.hidden=step!==3;
    next.classList.toggle('hidden', step>=3);
    submit.classList.toggle('hidden', step!==3);
  }
  async function validateCurrent(){
    const panel=$(`.form-step[data-step="${step}"]`);
    const fields=$$('input,select,textarea',panel);
    for(const f of fields){
      if(!f.checkValidity()){
        const label=f.closest('label');
        const fieldName=(label?.childNodes?.[0]?.textContent||f.name||'ข้อมูล').trim();
        let msg=`กรุณาตรวจสอบช่อง “${fieldName}”`;
        if(f.validity.valueMissing) msg=`กรุณากรอก/เลือก “${fieldName}”`;
        else if(f.validity.typeMismatch) msg=`รูปแบบ “${fieldName}” ไม่ถูกต้อง`;
        await uiAlert('ข้อมูลยังไม่ครบ',msg,'warning');
        f.focus();
        return false;
      }
    }
    return true;
  }
  next.addEventListener('click',async()=>{ if(await validateCurrent()){step=Math.min(3,step+1);paint();window.scrollTo({top:$('#register').offsetTop-90,behavior:'smooth'});} });
  prev.addEventListener('click',()=>{step--;paint();});
  form.addEventListener('submit',async e=>{
    e.preventDefault(); if(!(await validateCurrent())) return;
    try{
      setLoading(true);
      const fd=new FormData(form), payload=Object.fromEntries(fd.entries());
      delete payload.photo;
      const file=$('#photoInput').files[0];
      if(file){ payload.photoDataUrl=await fileToDataUrl(file); payload.photoName=file.name; }
      const out=await api('registerMember',payload);
      form.reset(); step=1; paint(); syncConsentButton();
      $('#statusQuery').value=out.member.memberCode;
      await uiAlert('สมัครสมาชิกเรียบร้อย 🎉',`รหัสสมาชิก: ${out.member.memberCode}
สถานะ: ${out.member.status}

กรุณาจดรหัสสมาชิกนี้ไว้สำหรับตรวจสอบสถานะ`,'success');
      location.hash='status';
    }catch(err){ toast(err.message,'error'); }finally{setLoading(false);}
  });
}
function initStatusCheck(){
  $('#statusForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const query=$('#statusQuery').value.trim(); if(!query) return;
    try{
      setLoading(true); const out=await api('checkStatus',{query}); const m=out.member;
      $('#statusResult').innerHTML=`<div class="status-card">
        <span class="status-badge ${statusClass(m.status)}">${escapeHtml(m.status)}</span>
        <h4>${escapeHtml(m.memberCode)} • ${escapeHtml(m.fullName)}</h4>
        <p>วันที่สมัคร: ${escapeHtml(formatDate(m.registeredAt))}</p>
      </div>`;
    }catch(err){ $('#statusResult').innerHTML=''; toast(err.message,'error'); }finally{setLoading(false);}
  });
}
async function loadNews(){
  if(!apiReady()) return;
  try{
    const out=await api('publicNews',{});
    const list=out.news||[];
    window.SK_PUBLIC_NEWS=list;
    renderHomeNews(list.slice(0,3));
    const btn=$('#showAllNewsBtn');
    if(btn){
      btn.onclick=()=>openAllNews(list);
      btn.classList.toggle('hidden',list.length===0);
    }
  }catch(e){
    console.warn(e);
    if($('#newsList')) $('#newsList').innerHTML='<div class="news-empty">ยังไม่สามารถโหลดข่าวสารได้</div>';
  }
}
function renderHomeNews(list){
  const host=$('#newsList'); if(!host) return;
  if(!list.length){host.innerHTML='<div class="news-empty">ยังไม่มีข่าวสาร</div>';return;}
  host.innerHTML=list.map((n,i)=>`<article class="home-news-item">
    <div class="news-thumb ${['mint','pink','blue','amber'][i%4]}">${newsEmoji(n.category)}</div>
    <div class="home-news-copy">
      <div class="news-meta"><span>${escapeHtml(n.category||'ข่าวสาร')}</span>${n.publishDate?`<time>${escapeHtml(formatShortDate(n.publishDate))}</time>`:''}</div>
      <h4>${escapeHtml(n.title||'')}</h4>
      <p>${escapeHtml(String(n.content||'').slice(0,92))}${String(n.content||'').length>92?'…':''}</p>
    </div>
    <button class="news-arrow" type="button" onclick='openNewsDetail(${JSON.stringify(JSON.stringify(n))})'>›</button>
  </article>`).join('');
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
  let n={}; try{n=JSON.parse(json);}catch(_){}
  uiAlert(n.title||'ข่าวสาร',`${n.category||'ข่าวสาร'}\n\n${n.content||''}`,'success');
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

async function loadPublicStats(){if(!apiReady())return;try{const o=await api('publicStats',{});$('#homeStatTotal').textContent=Number(o.stats.total||0).toLocaleString('th-TH');$('#homeStatActive').textContent=Number(o.stats.active||0).toLocaleString('th-TH')}catch(e){console.warn(e)}}
