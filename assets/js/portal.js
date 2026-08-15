let portalSession=null,portalData=null;
document.addEventListener('DOMContentLoaded',()=>{
  restorePortalSession();

  $('#portalLoginBtn')?.addEventListener('click',portalLogin);
  $('#portalLogoutBtn')?.addEventListener('click',portalLogout);
  $('#portalProfileForm')?.addEventListener('submit',portalSaveProfile);
  $('#portalPhotoInput')?.addEventListener('change',portalChangePhoto);
  $('#portalCardBtn')?.addEventListener('click',openPortalCard);
  $('#portalCertificateBtn')?.addEventListener('click',()=>portalData&&printMemberCertificate(portalData.member));
  $('#portalCardPrintBtn')?.addEventListener('click',()=>portalData&&printDigitalCard(portalData.member));
  document.querySelectorAll('[data-portal-tab]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-portal-tab]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('[data-portal-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.portalPanel!==btn.dataset.portalTab));}));
  document.addEventListener('click',e=>{if(e.target.closest('[data-close-portal-card]'))$('#portalCardModal')?.classList.add('hidden');});
});
async function restorePortalSession(){
  const token=sessionStorage.getItem('sk_member_portal_session');
  if(!token)return;
  try{
    setLoading(true);
    const out=await api('memberPortalSession',{session:token});
    portalSession=out.session;portalData=out;renderPortal(out);
    $('#portalLoginBox')?.classList.add('hidden');$('#portalContent')?.classList.remove('hidden');
  }catch(e){
    sessionStorage.removeItem('sk_member_portal_session');sessionStorage.removeItem('sk_member_portal_data');
    $('#portalContent')?.classList.add('hidden');$('#portalLoginBox')?.classList.remove('hidden');
    await uiAlert('ไม่สามารถเปิดข้อมูลสมาชิก',e.message,'warning');
  }finally{setLoading(false);}
}
async function portalLogin(){
  const memberCode=$('#portalMemberCode').value.trim().toUpperCase(),identifier=$('#portalIdentifier').value.trim();
  if(!memberCode||!identifier)return uiAlert('กรอกข้อมูลไม่ครบ','กรุณากรอกรหัสสมาชิก และอีเมลหรือเบอร์โทรศัพท์','warning');
  try{setLoading(true);const o=await api('memberPortalLogin',{memberCode,identifier});portalSession=o.session;portalData=o;sessionStorage.setItem('sk_member_portal_session',o.session);sessionStorage.setItem('sk_member_code',memberCode);renderPortal(o);$('#portalLoginBox').classList.add('hidden');$('#portalContent').classList.remove('hidden');}
  catch(e){uiAlert('เข้าสู่ข้อมูลสมาชิกไม่สำเร็จ',e.message,'error');}finally{setLoading(false);}
}
function portalLogout(){portalSession=null;portalData=null;sessionStorage.removeItem('sk_member_portal_session');sessionStorage.removeItem('sk_member_portal_data');$('#portalContent')?.classList.add('hidden');$('#portalLoginBox')?.classList.remove('hidden');}
function renderPortal(o){
  portalData=o;const m=o.member||{};$('#portalName').textContent=((m.prefix||'')+' '+(m.fullName||'')).trim();$('#portalCode').textContent=m.memberCode||'-';$('#portalStatus').textContent=m.status||'-';
  $('#portalFullName').value=((m.prefix||'')+' '+(m.fullName||'')).trim();
  $('#portalArabicName').value=m.arabicName||'';$('#portalPhone').value=m.phone||'';$('#portalEditEmail').value=m.email||'';
  const a=m.addressParts||{};
  [['#portalHouseNo','houseNo'],['#portalMoo','moo'],['#portalSoi','soi'],['#portalRoad','road'],['#portalSubdistrict','subdistrict'],['#portalDistrict','district'],['#portalProvince','province'],['#portalPostalCode','postalCode']].forEach(([sel,key])=>{if($(sel))$(sel).value=a[key]||'';});
  if(m.photoUrl)$('#portalPhoto').src=m.photoUrl;else $('#portalPhoto').removeAttribute('src');
  renderHistory('#portalPayments',o.payments||[]);renderHistory('#portalDonations',o.donations||[]);renderHistory('#portalBenefits',o.benefits||[]);
  renderPortalSummary(o);
  renderRenewalNotice(m);
}
function renderRenewalNotice(m){
  const host=$('#portalRenewalNotice');if(!host)return;host.classList.add('hidden');
  if(!m.memberExpire)return;const d=new Date(m.memberExpire),days=Math.ceil((d-Date.now())/86400000);
  if(days<=60){host.classList.remove('hidden');host.innerHTML=days<0?`⚠️ สมาชิกหมดอายุแล้ว ${Math.abs(days)} วัน กรุณาชำระค่าสมาชิกเพื่อต่ออายุ`:`⏳ สมาชิกจะครบกำหนดในอีก ${days} วัน (${escapeHtml(formatDate(m.memberExpire))})`;}
}
function renderHistory(sel,rows){const host=$(sel);if(!host)return;host.innerHTML=rows.length?`<div class="portal-history-table"><table><thead><tr><th>วันที่</th><th>รายการ</th><th>จำนวนเงิน</th><th>สถานะ</th><th>เลขอ้างอิง</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${escapeHtml(formatDate(x.date))}</td><td>${escapeHtml(x.title||'-')}</td><td>${Number(x.amount||0).toLocaleString('th-TH')} บาท</td><td>${escapeHtml(x.status||'-')}</td><td>${escapeHtml(x.reference||'-')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">ยังไม่มีประวัติ</div>';}
async function portalSaveProfile(e){
  e.preventDefault();if(!portalSession)return;
  const postal=$('#portalPostalCode')?.value.trim()||'';
  if(postal&&!/^\d{5}$/.test(postal))return uiAlert('รหัสไปรษณีย์ไม่ถูกต้อง','กรุณากรอกรหัสไปรษณีย์ 5 หลัก','warning');
  const payload={session:portalSession,phone:$('#portalPhone').value,email:$('#portalEditEmail').value,
    houseNo:$('#portalHouseNo')?.value||'',moo:$('#portalMoo')?.value||'',soi:$('#portalSoi')?.value||'',road:$('#portalRoad')?.value||'',
    subdistrict:$('#portalSubdistrict')?.value||'',district:$('#portalDistrict')?.value||'',province:$('#portalProvince')?.value||'',postalCode:postal};
  try{setLoading(true);const o=await api('memberPortalUpdate',payload);portalData.member=o.member;renderPortal({...portalData,member:o.member});await uiAlert('บันทึกแล้ว','อัปเดตข้อมูลติดต่อและที่อยู่เรียบร้อย','success');}
  catch(err){uiAlert('บันทึกไม่สำเร็จ',err.message,'error');}finally{setLoading(false);}
}
async function portalChangePhoto(e){const f=e.target.files?.[0];if(!f||!portalSession)return;try{setLoading(true);const data=await compressPortalPhoto(f);const o=await api('memberPortalUpdatePhoto',{session:portalSession,photoDataUrl:data,photoName:f.name});portalData.member=o.member;$('#portalPhoto').src=o.member.photoUrl;await uiAlert('อัปเดตรูปแล้ว','รูปสมาชิกใหม่ถูกบันทึกเรียบร้อย','success');}catch(err){uiAlert('เปลี่ยนรูปไม่สำเร็จ',err.message,'error');}finally{setLoading(false);e.target.value='';}}
async function compressPortalPhoto(file){const raw=await fileToDataUrl(file),img=new Image();await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=raw;});const max=1000,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.85);}
function openPortalCard(){if(!portalData)return;const m=portalData.member;$('#portalDigitalCard').innerHTML=`<div class="digital-member-card"><div class="digital-card-brand"><img src="assets/img/association-logo.jpg"><div><b>สมาคมศิษย์เก่านูรุ้ลอิสลามสัมพันธ์</b><small>(สุเหร่าเขียว)</small></div></div><div class="digital-card-body">${m.photoUrl?`<img src="${escapeHtml(m.photoUrl)}">`:'<div class="digital-card-photo">SK</div>'}<div><span>รหัสสมาชิก</span><h2>${escapeHtml(m.memberCode)}</h2><h3>${escapeHtml((m.prefix||'')+' '+(m.fullName||''))}</h3><p>${escapeHtml(m.arabicName||'')}</p><b class="digital-status">${escapeHtml(m.status||'')}</b></div></div><div class="digital-card-foot">เริ่มสมาชิก ${escapeHtml(m.memberStart?formatDate(m.memberStart):'-')}　•　หมดอายุ ${escapeHtml(m.memberExpire?formatDate(m.memberExpire):'-')}</div></div>`;$('#portalCardModal').classList.remove('hidden');}
function printDigitalCard(m){
 const w=window.open('','_blank','width=760,height=520');if(!w)return uiAlert('เปิดหน้าพิมพ์ไม่ได้','กรุณาอนุญาต Pop-up','warning');const logo=new URL('assets/img/association-logo.jpg',location.href).href,name=((m.prefix||'')+' '+(m.fullName||'')).trim()||'-';
 w.document.write(`<html lang="th"><head><meta charset="utf-8"><title>บัตรสมาชิก ${escapeHtml(m.memberCode)}</title><style>@page{size:85.6mm 53.98mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:"Noto Sans Thai",Tahoma,Arial,sans-serif;background:#eaf3ee;display:grid;place-items:center;min-height:100vh}.card{width:85.6mm;height:53.98mm;overflow:hidden;position:relative;border-radius:4mm;background:linear-gradient(135deg,#f8fff9 0%,#e5f7ed 62%,#d5efdf 100%);border:.45mm solid #18845c;color:#164536;padding:4.5mm}.card:after{content:'☾';position:absolute;right:3mm;bottom:-10mm;font-size:35mm;color:rgba(21,137,91,.08);transform:rotate(-14deg)}.top{display:flex;align-items:center;gap:2.5mm;border-bottom:.3mm solid rgba(24,132,92,.25);padding-bottom:2mm}.top img{width:12mm;height:12mm;object-fit:contain;border-radius:50%;background:#fff;padding:1mm}.org{font-size:3.1mm;font-weight:800;line-height:1.25}.sub{font-size:2.3mm;color:#5f776c}.body{display:grid;grid-template-columns:17mm 1fr;gap:3mm;align-items:center;padding-top:2.5mm;position:relative;z-index:1}.photo{width:17mm;height:22mm;object-fit:cover;border-radius:2.6mm;border:.3mm solid #b8d8c8;background:#fff}.code{font-size:5.2mm;line-height:1;color:#087852;font-weight:900;letter-spacing:.2mm}.name{font-size:3.5mm;font-weight:800;margin-top:1.7mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.arabic{font-size:2.7mm;color:#5d7469;margin-top:.6mm}.status{display:inline-block;margin-top:1.6mm;padding:.7mm 1.8mm;border-radius:20mm;background:#dff5e7;color:#17724e;font-size:2.3mm;font-weight:800}.valid{font-size:2.2mm;color:#687c72;margin-top:1mm}.actions{position:fixed;right:16px;top:16px;padding:8px 12px;border:1px solid #b7c9c0;border-radius:9px;background:#fff}@media print{body{background:#fff;display:block}.actions{display:none}.card{border-radius:0}}</style></head><body><button class="actions" onclick="print()">พิมพ์ / PDF</button><div class="card"><div class="top"><img src="${logo}"><div><div class="org">สมาคมศิษย์เก่านูรุ้ลอิสลามสัมพันธ์</div><div class="sub">(สุเหร่าเขียว) · Nurul Islam</div></div></div><div class="body">${m.photoUrl?`<img class="photo" src="${escapeHtml(m.photoUrl)}">`:'<div class="photo"></div>'}<div><div class="code">${escapeHtml(m.memberCode)}</div><div class="name">${escapeHtml(name)}</div><div class="arabic">${escapeHtml(m.arabicName||'')}</div><span class="status">${escapeHtml(m.status||'สมาชิกสมบูรณ์')}</span><div class="valid">${m.memberExpire?'ใช้ได้ถึง '+escapeHtml(formatDate(m.memberExpire)):'บัตรสมาชิกศิษย์เก่า'}</div></div></div></div></body></html>`);w.document.close();w.focus();
}
function printMemberCertificate(m){const w=window.open('','_blank','width=850,height=1000');if(!w)return uiAlert('เปิดหน้าพิมพ์ไม่ได้','กรุณาอนุญาต Pop-up','warning');const logo=new URL('assets/img/association-logo.jpg',location.href).href;w.document.write(`<html><head><meta charset="utf-8"><title>หลักฐานสมาชิก ${escapeHtml(m.memberCode)}</title><style>@page{size:A4;margin:18mm}body{font-family:Arial;color:#173c31;text-align:center}.logo{width:100px}.box{border:2px solid #23815d;border-radius:18px;padding:30px;margin-top:25px}.name{font-size:28px}.code{font-size:34px;color:#087651;font-weight:800}.actions{position:fixed;right:20px;top:20px}@media print{.actions{display:none}}</style></head><body><div style="position:absolute;left:18mm;top:8mm;font-size:10px;color:#667">วันที่พิมพ์ ${escapeHtml(formatDate(new Date()))}</div><button class="actions" onclick="print()">พิมพ์ / Save as PDF</button><img class="logo" src="${logo}"><h2>หลักฐานการเป็นสมาชิก</h2><h3>สมาคมศิษย์เก่านูรุ้ลอิสลามสัมพันธ์ (สุเหร่าเขียว)</h3><div class="box"><p>ขอรับรองว่า</p><div class="name">${escapeHtml((m.prefix||'')+' '+(m.fullName||''))}</div><p>เป็นสมาชิกของสมาคม รหัสสมาชิก</p><div class="code">${escapeHtml(m.memberCode)}</div><p>สถานะ: ${escapeHtml(m.status||'-')}</p><p>เริ่มสมาชิก: ${escapeHtml(m.memberStart?formatDate(m.memberStart):'-')}　หมดอายุ: ${escapeHtml(m.memberExpire?formatDate(m.memberExpire):'-')}</p></div><p style="margin-top:50px;text-align:right;font-size:11px">© 2026 SK Alumni Member System by KimhanIkals | V1.0.23</p></body></html>`);w.document.close();}

function renderPortalSummary(o){
  const m=o.member||{},payments=(o.payments||[]).filter(x=>String(x.status||'').includes('อนุมัติ')||String(x.status||'').includes('ตรวจสอบแล้ว')),
    donations=(o.donations||[]).filter(x=>String(x.status||'').includes('อนุมัติ')||String(x.status||'').includes('ตรวจสอบแล้ว')),
    benefits=o.benefits||[];
  if($('#portalSummaryStatus'))$('#portalSummaryStatus').textContent=m.status||'-';
  if($('#portalSummaryPayments'))$('#portalSummaryPayments').textContent=payments.reduce((s,x)=>s+Number(x.amount||0),0).toLocaleString('th-TH')+' บาท';
  if($('#portalSummaryDonations'))$('#portalSummaryDonations').textContent=donations.reduce((s,x)=>s+Number(x.amount||0),0).toLocaleString('th-TH')+' บาท';
  if($('#portalSummaryBenefits'))$('#portalSummaryBenefits').textContent=benefits.length.toLocaleString('th-TH')+' ครั้ง';
}
