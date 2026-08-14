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
  $('#portalFullName').value=((m.prefix||'')+' '+(m.fullName||'')).trim();$('#portalArabicName').value=m.arabicName||'';$('#portalPhone').value=m.phone||'';$('#portalEditEmail').value=m.email||'';$('#portalAddress').value=m.address||'';
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
async function portalSaveProfile(e){e.preventDefault();if(!portalSession)return;try{setLoading(true);const o=await api('memberPortalUpdate',{session:portalSession,phone:$('#portalPhone').value,email:$('#portalEditEmail').value});portalData.member=o.member;await uiAlert('บันทึกแล้ว','อัปเดตข้อมูลติดต่อเรียบร้อย','success');}catch(err){uiAlert('บันทึกไม่สำเร็จ',err.message,'error');}finally{setLoading(false);}}
async function portalChangePhoto(e){const f=e.target.files?.[0];if(!f||!portalSession)return;try{setLoading(true);const data=await compressPortalPhoto(f);const o=await api('memberPortalUpdatePhoto',{session:portalSession,photoDataUrl:data,photoName:f.name});portalData.member=o.member;$('#portalPhoto').src=o.member.photoUrl;await uiAlert('อัปเดตรูปแล้ว','รูปสมาชิกใหม่ถูกบันทึกเรียบร้อย','success');}catch(err){uiAlert('เปลี่ยนรูปไม่สำเร็จ',err.message,'error');}finally{setLoading(false);e.target.value='';}}
async function compressPortalPhoto(file){const raw=await fileToDataUrl(file),img=new Image();await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=raw;});const max=1000,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.85);}
function openPortalCard(){if(!portalData)return;const m=portalData.member;$('#portalDigitalCard').innerHTML=`<div class="digital-member-card"><div class="digital-card-brand"><img src="assets/img/association-logo.jpg"><div><b>สมาคมศิษย์เก่านูรุ้ลอิสลามสัมพันธ์</b><small>(สุเหร่าเขียว)</small></div></div><div class="digital-card-body">${m.photoUrl?`<img src="${escapeHtml(m.photoUrl)}">`:'<div class="digital-card-photo">SK</div>'}<div><span>รหัสสมาชิก</span><h2>${escapeHtml(m.memberCode)}</h2><h3>${escapeHtml((m.prefix||'')+' '+(m.fullName||''))}</h3><p>${escapeHtml(m.arabicName||'')}</p><b class="digital-status">${escapeHtml(m.status||'')}</b></div></div><div class="digital-card-foot">เริ่มสมาชิก ${escapeHtml(m.memberStart?formatDate(m.memberStart):'-')}　•　หมดอายุ ${escapeHtml(m.memberExpire?formatDate(m.memberExpire):'-')}</div></div>`;$('#portalCardModal').classList.remove('hidden');}
function printDigitalCard(m){const w=window.open('','_blank','width=700,height=700');if(!w)return uiAlert('เปิดหน้าพิมพ์ไม่ได้','กรุณาอนุญาต Pop-up','warning');const logo=new URL('assets/img/association-logo.jpg',location.href).href;w.document.write(`<html><head><meta charset="utf-8"><title>บัตรสมาชิก ${escapeHtml(m.memberCode)}</title><style>body{font-family:Arial;padding:35px}.card{border:2px solid #19815a;border-radius:22px;padding:22px;background:#f2fbf5;max-width:650px}.top{display:flex;align-items:center;gap:12px}.top img{width:70px}.body{display:grid;grid-template-columns:130px 1fr;gap:20px;align-items:center;margin-top:20px}.body>img{width:125px;height:150px;object-fit:cover;border-radius:15px}.code{font-size:30px;color:#087651}.actions{position:fixed;right:20px;top:20px}@media print{.actions{display:none}}</style></head><body><button class="actions" onclick="print()">พิมพ์ / PDF</button><div class="card"><div class="top"><img src="${logo}"><h3>สมาคมศิษย์เก่านูรุ้ลอิสลามสัมพันธ์ (สุเหร่าเขียว)</h3></div><div class="body">${m.photoUrl?`<img src="${escapeHtml(m.photoUrl)}">`:''}<div><div class="code">${escapeHtml(m.memberCode)}</div><h2>${escapeHtml((m.prefix||'')+' '+(m.fullName||''))}</h2><p>${escapeHtml(m.arabicName||'')}</p><b>${escapeHtml(m.status||'')}</b></div></div></div></body></html>`);w.document.close();}
function printMemberCertificate(m){const w=window.open('','_blank','width=850,height=1000');if(!w)return uiAlert('เปิดหน้าพิมพ์ไม่ได้','กรุณาอนุญาต Pop-up','warning');const logo=new URL('assets/img/association-logo.jpg',location.href).href;w.document.write(`<html><head><meta charset="utf-8"><title>หลักฐานสมาชิก ${escapeHtml(m.memberCode)}</title><style>@page{size:A4;margin:18mm}body{font-family:Arial;color:#173c31;text-align:center}.logo{width:100px}.box{border:2px solid #23815d;border-radius:18px;padding:30px;margin-top:25px}.name{font-size:28px}.code{font-size:34px;color:#087651;font-weight:800}.actions{position:fixed;right:20px;top:20px}@media print{.actions{display:none}}</style></head><body><button class="actions" onclick="print()">พิมพ์ / Save as PDF</button><img class="logo" src="${logo}"><h2>หลักฐานการเป็นสมาชิก</h2><h3>สมาคมศิษย์เก่านูรุ้ลอิสลามสัมพันธ์ (สุเหร่าเขียว)</h3><div class="box"><p>ขอรับรองว่า</p><div class="name">${escapeHtml((m.prefix||'')+' '+(m.fullName||''))}</div><p>เป็นสมาชิกของสมาคม รหัสสมาชิก</p><div class="code">${escapeHtml(m.memberCode)}</div><p>สถานะ: ${escapeHtml(m.status||'-')}</p><p>เริ่มสมาชิก: ${escapeHtml(m.memberStart?formatDate(m.memberStart):'-')}　หมดอายุ: ${escapeHtml(m.memberExpire?formatDate(m.memberExpire):'-')}</p></div><p style="margin-top:50px;text-align:right;font-size:11px">© 2026 SK Alumni Member System by KimhanIkals | V1.0.21</p></body></html>`);w.document.close();}

function renderPortalSummary(o){
  const m=o.member||{},payments=(o.payments||[]).filter(x=>String(x.status||'').includes('อนุมัติ')||String(x.status||'').includes('ตรวจสอบแล้ว')),
    donations=(o.donations||[]).filter(x=>String(x.status||'').includes('อนุมัติ')||String(x.status||'').includes('ตรวจสอบแล้ว')),
    benefits=o.benefits||[];
  if($('#portalSummaryStatus'))$('#portalSummaryStatus').textContent=m.status||'-';
  if($('#portalSummaryPayments'))$('#portalSummaryPayments').textContent=payments.reduce((s,x)=>s+Number(x.amount||0),0).toLocaleString('th-TH')+' บาท';
  if($('#portalSummaryDonations'))$('#portalSummaryDonations').textContent=donations.reduce((s,x)=>s+Number(x.amount||0),0).toLocaleString('th-TH')+' บาท';
  if($('#portalSummaryBenefits'))$('#portalSummaryBenefits').textContent=benefits.length.toLocaleString('th-TH')+' ครั้ง';
}
