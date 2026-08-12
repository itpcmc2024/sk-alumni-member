let adminToken = sessionStorage.getItem('sk_admin_token') || '';
let allMembers = [];
let memberPage=1;

document.addEventListener('DOMContentLoaded', ()=>{
  $('#loginForm').addEventListener('submit', login);
  $('#logoutBtn').addEventListener('click', logout);
  $('#refreshBtn').addEventListener('click', refreshDashboard);
  $('#memberSearch').addEventListener('input',()=>{memberPage=1;renderMembers();});
  $('#statusFilter').addEventListener('change',()=>{memberPage=1;renderMembers();});
  $('#sortOrder')?.addEventListener('change',()=>{memberPage=1;renderMembers();});
  $('#pageSize')?.addEventListener('change',()=>{memberPage=1;renderMembers();});
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
  const q=$('#memberSearch').value.trim().toLowerCase(), st=$('#statusFilter').value;
  const sort=$('#sortOrder')?.value||'newest', sizeVal=$('#pageSize')?.value||'10';
  let rows=allMembers.filter(m=>{const hay=[m.memberCode,m.fullName,m.email,m.province,m.phone].join(' ').toLowerCase();return(!q||hay.includes(q))&&(!st||m.status===st);});
  rows.sort((x,y)=>{const a=new Date(x.registeredAt||0)-0,b=new Date(y.registeredAt||0)-0;return sort==='oldest'?a-b:b-a;});
  const ps=sizeVal==='all'?(rows.length||1):Number(sizeVal), pages=Math.max(1,Math.ceil(rows.length/ps)); if(memberPage>pages)memberPage=pages;
  const shown=sizeVal==='all'?rows:rows.slice((memberPage-1)*ps,memberPage*ps);
  $('#emptyMembers').classList.toggle('hidden',shown.length>0);
  $('#membersTbody').innerHTML=shown.map(m=>`<tr><td><b>${escapeHtml(m.memberCode)}</b></td><td>${escapeHtml(m.fullName)}</td><td>${escapeHtml(m.email)}</td><td>${escapeHtml(m.province||'-')}</td><td>${escapeHtml(formatDate(m.registeredAt))}</td><td><span class="status-badge ${statusClass(m.status)}">${escapeHtml(m.status)}</span></td><td><div class="row-actions">
  <button class="btn btn-view" onclick="viewMember('${escapeHtml(m.memberCode)}')">ดู</button>
  <button class="btn btn-edit" onclick="editMember('${escapeHtml(m.memberCode)}')">แก้ไข</button>
  <button class="btn btn-danger" onclick="deleteMember('${escapeHtml(m.memberCode)}','${escapeHtml(m.fullName).replace(/'/g,"&#39;")}')">ลบ</button>
  <button class="btn btn-print" onclick="printMember('${escapeHtml(m.memberCode)}')">พิมพ์</button>
  <select data-status="${escapeHtml(m.memberCode)}">${['รอตรวจสอบข้อมูล','รอชำระค่าสมาชิก','รอตรวจสอบการชำระ','สมาชิกสมบูรณ์','ไม่อนุมัติ'].map(s=>`<option ${s===m.status?'selected':''}>${s}</option>`).join('')}</select>
  <button class="btn btn-soft" onclick="saveStatus('${escapeHtml(m.memberCode)}')">บันทึก</button></div></td></tr>`).join('');
  const host=$('#memberPagerTop'); if(host)host.innerHTML=`<span>แสดง ${rows.length?((memberPage-1)*ps+1):0}-${Math.min(memberPage*ps,rows.length)} จาก ${rows.length} รายการ</span><div><button ${memberPage<=1?'disabled':''} onclick="goMemberPage(${memberPage-1})">‹</button> หน้า ${memberPage} / ${pages} <button ${memberPage>=pages?'disabled':''} onclick="goMemberPage(${memberPage+1})">›</button></div>`;
}
function goMemberPage(p){memberPage=Math.max(1,p);renderMembers();}
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
function renderMemberDetail(m){
  const photo=m.photoUrl?`<img class="detail-photo" src="${escapeHtml(m.photoUrl)}" alt="รูปสมาชิก" onerror="this.style.display='none'">`:`<div class="detail-photo placeholder">SK</div>`;
  $('#memberDetailBody').innerHTML=`
    <div class="detail-profile v107-detail-profile">
      ${photo}
      <div class="detail-status-block">
        <span class="status-badge ${statusClass(m.status)}">${escapeHtml(m.status)}</span>
        <h3 class="detail-member-name">${escapeHtml(m.prefix||'')} ${escapeHtml(m.fullName||'')}</h3>
        <p class="detail-arabic">${escapeHtml(m.arabicName||'')}</p>
      </div>
      <div class="detail-member-code">${escapeHtml(m.memberCode||'')}</div>
    </div>
    <div class="detail-grid">
      ${detailItem('วันที่สมัคร',formatDate(m.registeredAt))}
      ${detailItem('อีเมล',m.email)}
      ${detailItem('เบอร์โทรศัพท์',formatThaiPhone(m.phone||'-'))}
      ${detailItem('LINE User ID',m.lineUserId||'-')}
      ${detailItem('บ้านเลขที่',m.houseNo||'-')}
      ${detailItem('หมู่',m.moo||'-')}
      ${detailItem('ซอย',m.soi||'-')}
      ${detailItem('ถนน',m.road||'-')}
      ${detailItem('ตำบล / แขวง',m.subdistrict||'-')}
      ${detailItem('อำเภอ / เขต',m.district||'-')}
      ${detailItem('จังหวัด',m.province||'-')}
      ${detailItem('รหัสไปรษณีย์',m.postalCode||'-')}
      ${detailItem('เริ่มสมาชิก',m.memberStart?formatDate(m.memberStart):'-')}
      ${detailItem('หมดอายุ',m.memberExpire?formatDate(m.memberExpire):'-')}
    </div>`;
}


async function editMember(code){
  try{setLoading(true);const o=await api('adminMemberDetail',{token:adminToken,memberCode:code});const m=o.member;
    const f=$('#memberEditForm'); ['memberCode','prefix','fullName','arabicName','email','phone','houseNo','moo','soi','road','subdistrict','district','province','postalCode'].forEach(k=>{if(f.elements[k])f.elements[k].value=m[k]||''});
    $('#memberEditModal').classList.remove('hidden');
  }catch(e){uiAlert('เปิดแก้ไขไม่สำเร็จ',e.message,'error')}finally{setLoading(false)}
}
async function saveMemberEdit(e){e.preventDefault();const f=e.currentTarget,btn=f.querySelector('button[type="submit"]');if(btn.disabled)return;btn.disabled=true;btn.textContent='กำลังบันทึก...';try{const data=Object.fromEntries(new FormData(f).entries());await api('adminUpdateMember',{token:adminToken,...data});$('#memberEditModal').classList.add('hidden');await uiAlert('บันทึกแล้ว','แก้ไขข้อมูลสมาชิกเรียบร้อย');await refreshDashboard()}catch(err){uiAlert('บันทึกไม่สำเร็จ',err.message,'error')}finally{btn.disabled=false;btn.textContent='บันทึกข้อมูล'}}

// Admin modules V1.0.8
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
  e.preventDefault();
  const f=e.currentTarget;
  const submit=f.querySelector('button[type="submit"]');
  if(f.dataset.saving==='1') return;
  const title=String(f.title.value||'').trim();
  const content=String(f.content.value||'').trim();
  if(!title || !content){
    await uiAlert('ข้อมูลยังไม่ครบ','กรุณากรอกหัวข้อและรายละเอียดข่าว','warning');
    return;
  }
  f.dataset.saving='1';
  if(submit){
    submit.disabled=true;
    submit.dataset.oldText=submit.textContent;
    submit.textContent='กำลังบันทึก...';
  }
  try{
    setLoading(true);
    const requestId=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await api('adminSaveNews',{
      token:adminToken,
      requestId,
      newsId:f.newsId.value,
      category:f.category.value,
      title,
      content,
      active:f.active.checked
    });
    $('#newsEditModal').classList.add('hidden');
    await uiAlert('บันทึกแล้ว','ข่าวสารถูกบันทึกเรียบร้อย','success');
    await loadAdminNews();
  }catch(err){
    await uiAlert('บันทึกข่าวไม่สำเร็จ',err.message||String(err),'error');
  }finally{
    setLoading(false);
    f.dataset.saving='0';
    if(submit){
      submit.disabled=false;
      submit.textContent=submit.dataset.oldText||'บันทึก';
    }
  }
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

function formatThaiPhone(v){const d=String(v||'').replace(/\D/g,'');if(d.length===10)return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;if(d.length===9)return `${d.slice(0,2)}-${d.slice(2,5)}-${d.slice(5)}`;return String(v||'-');}
