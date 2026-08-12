/*
 SK Alumni Member System V1.0.0 - Hybrid
 IMPORTANT: หลัง Deploy Google Apps Script ให้ใส่ Web App URL ใน API_URL ด้านล่าง
*/
const SK_CONFIG = {
  VERSION: '1.0.0',
  API_URL: 'PASTE_YOUR_GAS_WEB_APP_URL_HERE'
};

const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];

function apiReady(){
  return SK_CONFIG.API_URL && SK_CONFIG.API_URL.startsWith('https://script.google.com/');
}
function setLoading(show){ const el=$('#loading'); if(el) el.classList.toggle('hidden', !show); }
function toast(msg, type='ok'){
  const el=$('#toast'); if(!el) return alert(msg);
  el.textContent=msg; el.className='toast show'+(type==='error'?' error':'');
  clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.className='toast',3800);
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
});

function initRegistration(){
  let step=1;
  const form=$('#registerForm'), prev=$('#prevBtn'), next=$('#nextBtn'), submit=$('#submitBtn');
  function paint(){
    $$('.form-step').forEach(x=>x.classList.toggle('active', Number(x.dataset.step)===step));
    $$('[data-step-indicator]').forEach(x=>x.classList.toggle('active', Number(x.dataset.stepIndicator)===step));
    prev.hidden=step===1; next.hidden=step===3; submit.hidden=step!==3;
  }
  function validateCurrent(){
    const panel=$(`.form-step[data-step="${step}"]`);
    const fields=$$('input,select,textarea',panel);
    for(const f of fields){ if(!f.checkValidity()){ f.reportValidity(); return false; } }
    return true;
  }
  next.addEventListener('click',()=>{ if(validateCurrent()){step++;paint();window.scrollTo({top:$('#register').offsetTop-90,behavior:'smooth'});} });
  prev.addEventListener('click',()=>{step--;paint();});
  form.addEventListener('submit',async e=>{
    e.preventDefault(); if(!validateCurrent()) return;
    try{
      setLoading(true);
      const fd=new FormData(form), payload=Object.fromEntries(fd.entries());
      delete payload.photo;
      const file=$('#photoInput').files[0];
      if(file){ payload.photoDataUrl=await fileToDataUrl(file); payload.photoName=file.name; }
      const out=await api('registerMember',payload);
      form.reset(); step=1; paint();
      $('#statusQuery').value=out.member.memberCode;
      toast(`สมัครเรียบร้อย รหัสสมาชิก ${out.member.memberCode}`);
      alert(`สมัครสมาชิกเรียบร้อย\n\nรหัสสมาชิก: ${out.member.memberCode}\nสถานะ: ${out.member.status}\n\nกรุณาจดรหัสสมาชิกนี้ไว้สำหรับตรวจสอบสถานะ`);
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
    if(!out.news?.length) return;
    $('#newsList').innerHTML=out.news.map(n=>`<article class="info-card"><span class="tag">${escapeHtml(n.category||'ข่าวสาร')}</span><h4>${escapeHtml(n.title)}</h4><p>${escapeHtml(n.content)}</p></article>`).join('');
  }catch(e){ console.warn(e); }
}
