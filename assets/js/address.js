const SK_THAI_ADDRESS_DB='https://raw.githubusercontent.com/earthchie/jquery.Thailand.js/master/jquery.Thailand.js/database/raw_database/raw_database.json';
let SK_ADDRESS_ROWS=[],SK_POSTAL_CODES=[];
function uniqSorted(v){return [...new Set(v.filter(x=>x!=null&&String(x).trim()).map(x=>String(x).trim()))].sort((a,b)=>a.localeCompare(b,'th'))}
function setSelectOptions(el,vals,ph){if(!el)return;el.innerHTML=`<option value="">${ph}</option>`+vals.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');el.disabled=!vals.length}
function autoPickIfSingle(el){if(el&&el.options.length===2){el.selectedIndex=1;el.dispatchEvent(new Event('change'));}}
function hidePostalSuggestions(){document.querySelector('#postalSuggestions')?.classList.add('hidden')}
function applyPostalCode(zip){
 const province=document.querySelector('#provinceSelect'),amphoe=document.querySelector('#districtSelect'),tambon=document.querySelector('#subdistrictSelect');
 const rows=SK_ADDRESS_ROWS.filter(r=>r.zipcode===zip);
 setSelectOptions(province,uniqSorted(rows.map(r=>r.province)),'-- เลือกจังหวัด --');
 setSelectOptions(amphoe,[],'-- เลือกอำเภอ / เขต --');setSelectOptions(tambon,[],'-- เลือกตำบล / แขวง --');autoPickIfSingle(province)
}
function renderPostalSuggestions(q){
 const box=document.querySelector('#postalSuggestions'),input=document.querySelector('#postalCodeInput'); if(!box||!input)return;
 q=String(q||'').replace(/\D/g,'').slice(0,5); if(!q){box.innerHTML='';box.classList.add('hidden');return}
 const matches=SK_POSTAL_CODES.filter(z=>z.startsWith(q)).slice(0,50);
 box.innerHTML=matches.length?matches.map(z=>{const rows=SK_ADDRESS_ROWS.filter(r=>r.zipcode===z),ps=uniqSorted(rows.map(r=>r.province)).join(', '),ds=uniqSorted(rows.map(r=>r.amphoe)).slice(0,3).join(', ');return `<button type="button" class="postal-option" data-postal="${z}"><b>${z}</b><span>${escapeHtml(ps)}${ds?' • '+escapeHtml(ds):''}</span></button>`}).join(''):`<div class="postal-empty">ไม่พบรหัสไปรษณีย์ ${escapeHtml(q)}</div>`;
 box.classList.remove('hidden');
 box.querySelectorAll('.postal-option').forEach(b=>b.onclick=()=>{input.value=b.dataset.postal;hidePostalSuggestions();applyPostalCode(b.dataset.postal)})
}
async function initThaiAddressSelector(){
 const zip=document.querySelector('#postalCodeInput'),province=document.querySelector('#provinceSelect'),amphoe=document.querySelector('#districtSelect'),tambon=document.querySelector('#subdistrictSelect'),status=document.querySelector('#addressDbStatus'); if(!zip||!province||!amphoe||!tambon)return;
 try{
  if(status)status.textContent='กำลังโหลดฐานข้อมูลที่อยู่...';
  const r=await fetch(SK_THAI_ADDRESS_DB,{cache:'force-cache'}); if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const rows=await r.json(); SK_ADDRESS_ROWS=rows.map(x=>({zipcode:String(x.zipcode||'').padStart(5,'0'),province:String(x.province||'').trim(),amphoe:String(x.amphoe||'').trim(),district:String(x.district||'').trim()})).filter(x=>/^\d{5}$/.test(x.zipcode)&&x.province&&x.amphoe&&x.district);
  SK_POSTAL_CODES=uniqSorted(SK_ADDRESS_ROWS.map(x=>x.zipcode)).sort((a,b)=>Number(a)-Number(b)); zip.disabled=false;
  if(status){status.textContent=`พร้อมใช้งาน • ${SK_POSTAL_CODES.length.toLocaleString('th-TH')} รหัสไปรษณีย์`;status.classList.add('ready')}
 }catch(err){console.error(err);if(status){status.textContent='โหลดฐานข้อมูลที่อยู่ไม่สำเร็จ';status.classList.add('error')}return}
 zip.addEventListener('input',()=>{const clean=zip.value.replace(/\D/g,'').slice(0,5);zip.value=clean;renderPostalSuggestions(clean);setSelectOptions(province,[],'-- เลือกจังหวัด --');setSelectOptions(amphoe,[],'-- เลือกอำเภอ / เขต --');setSelectOptions(tambon,[],'-- เลือกตำบล / แขวง --');if(clean.length===5&&SK_POSTAL_CODES.includes(clean))applyPostalCode(clean)});
 zip.addEventListener('focus',()=>zip.value&&renderPostalSuggestions(zip.value));zip.addEventListener('blur',()=>setTimeout(hidePostalSuggestions,180));
 province.addEventListener('change',()=>{const rows=SK_ADDRESS_ROWS.filter(r=>r.zipcode===zip.value&&r.province===province.value);setSelectOptions(amphoe,uniqSorted(rows.map(r=>r.amphoe)),'-- เลือกอำเภอ / เขต --');setSelectOptions(tambon,[],'-- เลือกตำบล / แขวง --');autoPickIfSingle(amphoe)});
 amphoe.addEventListener('change',()=>{const rows=SK_ADDRESS_ROWS.filter(r=>r.zipcode===zip.value&&r.province===province.value&&r.amphoe===amphoe.value);setSelectOptions(tambon,uniqSorted(rows.map(r=>r.district)),'-- เลือกตำบล / แขวง --');autoPickIfSingle(tambon)})
}
document.addEventListener('DOMContentLoaded',initThaiAddressSelector);
