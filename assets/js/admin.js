let adminToken = sessionStorage.getItem('sk_admin_token') || '';
let allMembers = [];

document.addEventListener('DOMContentLoaded', ()=>{
  $('#loginForm').addEventListener('submit', login);
  $('#logoutBtn').addEventListener('click', logout);
  $('#refreshBtn').addEventListener('click', refreshDashboard);
  $('#memberSearch').addEventListener('input', renderMembers);
  $('#statusFilter').addEventListener('change', renderMembers);
  if(adminToken) showDashboard();
});

async function login(e){
  e.preventDefault();
  try{
    setLoading(true);
    const fd=new FormData(e.currentTarget);
    const out=await api('adminLogin',Object.fromEntries(fd.entries()));
    adminToken=out.token; sessionStorage.setItem('sk_admin_token',adminToken);
    $('#adminWelcome').textContent=`เข้าสู่ระบบโดย ${out.admin.displayName || out.admin.username}`;
    showDashboard();
  }catch(err){toast(err.message,'error');}finally{setLoading(false);}
}
function logout(){
  adminToken=''; sessionStorage.removeItem('sk_admin_token');
  $('#dashboardPanel').classList.add('hidden'); $('#loginPanel').classList.remove('hidden'); $('#logoutBtn').classList.add('hidden');
}
async function showDashboard(){
  $('#loginPanel').classList.add('hidden'); $('#dashboardPanel').classList.remove('hidden'); $('#logoutBtn').classList.remove('hidden');
  await refreshDashboard();
}
async function refreshDashboard(){
  try{
    setLoading(true);
    const out=await api('adminDashboard',{token:adminToken});
    $('#statTotal').textContent=out.stats.total;
    $('#statPending').textContent=out.stats.pending;
    $('#statActive').textContent=out.stats.active;
    $('#statRejected').textContent=out.stats.rejected;
    allMembers=out.members || [];
    renderMembers();
  }catch(err){
    if(/session|token|เข้าสู่ระบบ/i.test(err.message)) logout();
    toast(err.message,'error');
  }finally{setLoading(false);}
}
function renderMembers(){
  const q=$('#memberSearch').value.trim().toLowerCase();
  const st=$('#statusFilter').value;
  const rows=allMembers.filter(m=>{
    const hay=[m.memberCode,m.fullName,m.email,m.province,m.phone].join(' ').toLowerCase();
    return (!q||hay.includes(q)) && (!st||m.status===st);
  });
  $('#emptyMembers').classList.toggle('hidden',rows.length>0);
  $('#membersTbody').innerHTML=rows.map(m=>`<tr>
    <td><b>${escapeHtml(m.memberCode)}</b></td><td>${escapeHtml(m.fullName)}</td><td>${escapeHtml(m.email)}</td>
    <td>${escapeHtml(m.province||'-')}</td><td>${escapeHtml(formatDate(m.registeredAt))}</td>
    <td><span class="status-badge ${statusClass(m.status)}">${escapeHtml(m.status)}</span></td>
    <td><div class="row-actions">
      <button class="btn btn-view" onclick="viewMember('${escapeHtml(m.memberCode)}')">ดู</button>
      <button class="btn btn-edit" onclick="editMember('${escapeHtml(m.memberCode)}')">แก้ไข</button>
      <button class="btn btn-danger" onclick="deleteMember('${escapeHtml(m.memberCode)}','${escapeHtml(m.fullName).replace(/'/g,"&#39;")}')">ลบ</button>
      <button class="btn btn-print" onclick="printMember('${escapeHtml(m.memberCode)}')">พิมพ์</button>
      <select data-status="${escapeHtml(m.memberCode)}">
        ${['รอตรวจสอบข้อมูล','รอชำระค่าสมาชิก','รอตรวจสอบการชำระ','สมาชิกสมบูรณ์','ไม่อนุมัติ'].map(s=>`<option ${s===m.status?'selected':''}>${s}</option>`).join('')}
      </select>
      <button class="btn btn-soft" onclick="saveStatus('${escapeHtml(m.memberCode)}')">บันทึก</button>
    </div></td>
  </tr>`).join('');
}
async function saveStatus(memberCode){
  const sel=document.querySelector(`[data-status="${CSS.escape(memberCode)}"]`);
  try{
    setLoading(true); await api('adminUpdateStatus',{token:adminToken,memberCode,status:sel.value});
    toast('บันทึกสถานะแล้ว'); await refreshDashboard();
  }catch(err){toast(err.message,'error');}finally{setLoading(false);}
}
async function deleteMember(memberCode,name){
  if(!(await uiConfirm('ยืนยันการลบสมาชิก',`รหัส ${memberCode}\n${name}\n\nระบบจะบันทึก Audit Log ก่อนลบ`))) return;
  try{
    setLoading(true); await api('adminDeleteMember',{token:adminToken,memberCode});
    toast('ลบสมาชิกแล้ว'); await refreshDashboard();
  }catch(err){toast(err.message,'error');}finally{setLoading(false);}
}

let currentDetailMember=null;
async function viewMember(code){try{setLoading(true);const o=await api('adminMemberDetail',{token:adminToken,memberCode:code});currentDetailMember=o.member;renderMemberDetail(o.member);$('#memberDetailModal').classList.remove('hidden')}catch(e){uiAlert('เปิดข้อมูลไม่สำเร็จ',e.message,'error')}finally{setLoading(false)}}
function detailItem(l,v){return `<div class="detail-item"><span>${escapeHtml(l)}</span><b>${escapeHtml(v??'-')}</b></div>`}
function renderMemberDetail(m){$('#memberDetailBody').innerHTML=`<div class="detail-profile detail-profile-v106">${m.photoUrl?`<img class="detail-photo" src="${escapeHtml(m.photoUrl)}" onerror="this.style.display='none'">`:`<div class="detail-photo placeholder">SK</div>`}<div class="detail-identity"><div class="detail-status-line"><span class="status-badge ${statusClass(m.status)}">${escapeHtml(m.status)}</span><div class="detail-name-code"><h3>${escapeHtml(m.prefix||'')} ${escapeHtml(m.fullName||'')} ${m.arabicName?`<span>(${escapeHtml(m.arabicName)})</span>`:''}</h3><strong>${escapeHtml(m.memberCode)}</strong></div></div></div></div><div class="detail-grid">${detailItem('วันที่สมัคร',formatDate(m.registeredAt))}${detailItem('อีเมล',m.email)}${detailItem('เบอร์โทรศัพท์',formatThaiPhone(m.phone||'-'))}${detailItem('LINE User ID',m.lineUserId||'-')}${detailItem('บ้านเลขที่',m.houseNo||'-')}${detailItem('หมู่',m.moo||'-')}${detailItem('ซอย',m.soi||'-')}${detailItem('ถนน',m.road||'-')}${detailItem('ตำบล / แขวง',m.subdistrict||'-')}${detailItem('อำเภอ / เขต',m.district||'-')}${detailItem('จังหวัด',m.province||'-')}${detailItem('รหัสไปรษณีย์',m.postalCode||'-')}</div>`}
function formatThaiPhone(v){const d=String(v||'').replace(/\D/g,'');return d.length===10?`${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`:String(v||'-')}
function closeMemberDetail(){$('#memberDetailModal')?.classList.add('hidden')}
document.addEventListener('click',e=>{if(e.target.closest('[data-close-member-detail]'))closeMemberDetail()});
document.addEventListener('DOMContentLoaded',()=>{$('#detailPrintBtn')?.addEventListener('click',()=>currentDetailMember&&openPrintApplication(currentDetailMember))});
async function printMember(code){try{setLoading(true);const o=await api('adminMemberDetail',{token:adminToken,memberCode:code});openPrintApplication(o.member)}catch(e){uiAlert('พิมพ์ไม่สำเร็จ',e.message,'error')}finally{setLoading(false)}}
function openPrintApplication(m){
 const w=window.open('','_blank','width=900,height=1100'); if(!w){uiAlert('ไม่สามารถเปิดหน้าพิมพ์','กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้','warning');return}
 const addr=[m.houseNo||'',m.moo?'หมู่ '+m.moo:'',m.soi?'ซอย '+m.soi:'',m.road?'ถนน '+m.road:'',m.subdistrict?'ตำบล/แขวง '+m.subdistrict:'',m.district?'อำเภอ/เขต '+m.district:'',m.province?'จังหวัด '+m.province:'',m.postalCode||''].filter(Boolean).join(' ');
 w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ใบสมัคร ${escapeHtml(m.memberCode)}</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#173c31}.head{text-align:center;border-bottom:2px solid #23815d;padding-bottom:12px}.head img{width:86px}.member{display:grid;grid-template-columns:115px 1fr;gap:18px;margin:18px 0}.photo{width:110px;height:135px;object-fit:cover;border:1px solid #ccc}.blank{display:grid;place-items:center}table{width:100%;border-collapse:collapse}td{padding:8px;border:1px solid #cfdcd5}td:first-child{width:28%;font-weight:700;background:#f1f8f4}.section{font-weight:800;color:#18724f;margin:17px 0 7px}.sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;margin-top:45px;text-align:center}.line{border-top:1px dotted #333;margin-top:45px;padding-top:5px}.foot{text-align:center;font-size:10px;color:#78857f;margin-top:25px}.actions{position:fixed;right:18px;top:18px}@media print{.actions{display:none}}</style></head><body><button class="actions" onclick="window.print()">🖨 พิมพ์ / Save as PDF</button><div class="head"><img src="assets/img/association-logo.jpg"><h2 style="margin:8px 0 2px">ใบสมัครสมาชิก</h2><h3 style="margin:0">สมาชิกสมาคมศิษย์เก่านูรุ้ลอิสลามสัมพันธ์ (สุเหร่าเขียว)</h3></div><div class="member">${m.photoUrl?`<img class="photo" referrerpolicy="no-referrer" src="${escapeHtml(m.photoUrl)}">`:`<div class="photo blank">รูปถ่าย</div>`}<table><tr><td>รหัสสมาชิก</td><td><b>${escapeHtml(m.memberCode)}</b></td></tr><tr><td>สถานะ</td><td>${escapeHtml(m.status)}</td></tr><tr><td>วันที่สมัคร</td><td>${escapeHtml(formatDate(m.registeredAt))}</td></tr></table></div><div class="section">ข้อมูลส่วนตัว</div><table><tr><td>ชื่อ-สกุล</td><td>${escapeHtml((m.prefix||'')+' '+(m.fullName||''))}</td></tr><tr><td>ชื่ออาหรับ</td><td>${escapeHtml(m.arabicName||'-')}</td></tr><tr><td>เบอร์โทรศัพท์</td><td>${escapeHtml(formatThaiPhone(m.phone||'-'))}</td></tr><tr><td>อีเมล</td><td>${escapeHtml(m.email||'-')}</td></tr></table><div class="section">ที่อยู่</div><table><tr><td>ที่อยู่</td><td>${escapeHtml(addr||'-')}</td></tr></table><div class="sign"><div><div class="line">ลายมือชื่อผู้สมัคร</div></div><div><div class="line">ประธานสมาคมฯ</div></div><div><div class="line">เจ้าหน้าที่ผู้ตรวจสอบ</div></div></div><div class="foot">© 2026 SK Alumni Member System by KimhanIkals | V1.0.6</div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close()
}


async function editMember(code){
  try{setLoading(true);const o=await api('adminMemberDetail',{token:adminToken,memberCode:code});const m=o.member;
    const f=$('#memberEditForm'); ['memberCode','prefix','fullName','arabicName','email','phone','houseNo','moo','soi','road','subdistrict','district','province','postalCode'].forEach(k=>{if(f.elements[k])f.elements[k].value=m[k]||''});
    $('#memberEditModal').classList.remove('hidden');
  }catch(e){uiAlert('เปิดแก้ไขไม่สำเร็จ',e.message,'error')}finally{setLoading(false)}
}
async function saveMemberEdit(e){e.preventDefault();const f=e.currentTarget,btn=f.querySelector('button[type="submit"]');if(btn.disabled)return;btn.disabled=true;btn.textContent='กำลังบันทึก...';try{const data=Object.fromEntries(new FormData(f).entries());await api('adminUpdateMember',{token:adminToken,...data});$('#memberEditModal').classList.add('hidden');await uiAlert('บันทึกแล้ว','แก้ไขข้อมูลสมาชิกเรียบร้อย');await refreshDashboard()}catch(err){uiAlert('บันทึกไม่สำเร็จ',err.message,'error')}finally{btn.disabled=false;btn.textContent='บันทึกข้อมูล'}}

// Admin modules V1.0.6
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-admin-tab]').forEach(btn=>btn.addEventListener('click',()=>switchAdminTab(btn.dataset.adminTab)));
  $('#newNewsBtn')?.addEventListener('click',()=>openNewsEditor());
  $('#newsEditForm')?.addEventListener('submit',saveNews);
  $('#refreshMediaBtn')?.addEventListener('click',loadMedia);
  $('#settingsForm')?.addEventListener('submit',saveSettings);
  $('#memberEditForm')?.addEventListener('submit',saveMemberEdit);
  document.addEventListener('click',e=>{if(e.target.closest('[data-close-news]')) $('#newsEditModal')?.classList.add('hidden'); if(e.target.closest('[data-close-member-edit]')) $('#memberEditModal')?.classList.add('hidden');});
});
function switchAdminTab(name){
  document.querySelectorAll('[data-admin-tab]').forEach(x=>x.classList.toggle('active',x.dataset.adminTab===name));
  document.querySelectorAll('[data-admin-panel]').forEach(x=>x.classList.toggle('hidden',x.dataset.adminPanel!==name));
  if(name==='news') loadAdminNews();
  if(name==='media') loadMedia();
  if(name==='settings') loadSettings();
}
let adminNewsCache=[];
async function loadAdminNews(){
  try{
    const o=await api('adminNewsList',{token:adminToken}); adminNewsCache=o.news||[];
    $('#newsAdminList').innerHTML=adminNewsCache.length?adminNewsCache.map(n=>`<div class="admin-list-item">
      <div><span class="tag">${escapeHtml(n.Category||'ข่าวสาร')}</span><b>${escapeHtml(n.Title||'')}</b><small>${escapeHtml(String(n.Content||'').slice(0,140))}</small></div>
      <div class="inline-actions"><button class="btn btn-view" onclick="editNews('${escapeHtml(n.NewsId)}')">✏️ แก้ไข</button><button class="btn btn-danger" onclick="deleteNews('${escapeHtml(n.NewsId)}')">ลบ</button></div>
    </div>`).join(''):'<div class="empty">ยังไม่มีข่าวสาร</div>';
  }catch(e){uiAlert('โหลดข่าวไม่สำเร็จ',e.message,'error');}
}
function openNewsEditor(n=null){
  const f=$('#newsEditForm'); f.reset(); f.active.checked=true;
  f.newsId.value=n?.NewsId||''; f.category.value=n?.Category||'ข่าวสาร'; f.title.value=n?.Title||''; f.content.value=n?.Content||''; f.active.checked=String(n?.Active??true).toUpperCase()!=='FALSE';
  $('#newsEditModal').classList.remove('hidden');
}
function editNews(id){openNewsEditor(adminNewsCache.find(x=>String(x.NewsId)===String(id)));}
async function saveNews(e){
  e.preventDefault(); const f=e.currentTarget,btn=f.querySelector('button[type="submit"]'); if(btn.disabled)return; btn.disabled=true; const old=btn.textContent; btn.textContent='กำลังบันทึก...';
  try{setLoading(true);await api('adminSaveNews',{token:adminToken,newsId:f.newsId.value,category:f.category.value,title:f.title.value,content:f.content.value,active:f.active.checked});$('#newsEditModal').classList.add('hidden');await uiAlert('บันทึกแล้ว','ข่าวสารได้รับการบันทึกเรียบร้อย');loadAdminNews();}
  catch(err){uiAlert('บันทึกไม่สำเร็จ',err.message,'error');}finally{setLoading(false);btn.disabled=false;btn.textContent=old;}
}
async function deleteNews(id){
  if(!(await uiConfirm('ลบข่าวสาร','ยืนยันการลบข่าวนี้?')))return;
  try{await api('adminDeleteNews',{token:adminToken,newsId:id});loadAdminNews();}catch(e){uiAlert('ลบไม่สำเร็จ',e.message,'error');}
}
async function loadMedia(){
  try{
    const o=await api('adminMediaList',{token:adminToken});
    $('#mediaAdminList').innerHTML=(o.files||[]).map(f=>`<a class="media-card" href="${escapeHtml(f.url)}" target="_blank">
      ${f.preview?`<img src="${escapeHtml(f.preview)}" loading="lazy">`:`<div class="media-file-icon">📄</div>`}
      <b>${escapeHtml(f.name)}</b><small>${escapeHtml(f.folder)} • ${(Number(f.size||0)/1024).toFixed(1)} KB</small>
    </a>`).join('')||'<div class="empty">ยังไม่มีไฟล์</div>';
  }catch(e){uiAlert('โหลดไฟล์ไม่สำเร็จ',e.message,'error');}
}
async function loadSettings(){
  try{
    const o=await api('adminSettingsGet',{token:adminToken}), f=$('#settingsForm');
    Object.entries(o.settings||{}).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v??'';});
  }catch(e){uiAlert('โหลดการตั้งค่าไม่สำเร็จ',e.message,'error');}
}
async function saveSettings(e){
  e.preventDefault(); const f=e.currentTarget, settings={};
  ['APP_NAME','CONTACT_EMAIL','MEMBERSHIP_FEE_YEARLY','MEMBERSHIP_FEE_MONTHLY','PROMPTPAY'].forEach(k=>settings[k]=f.elements[k]?.value||'');
  try{setLoading(true);await api('adminSettingsSave',{token:adminToken,settings});await uiAlert('บันทึกแล้ว','อัปเดตการตั้งค่าระบบเรียบร้อย');}catch(err){uiAlert('บันทึกไม่สำเร็จ',err.message,'error');}finally{setLoading(false);}
}
