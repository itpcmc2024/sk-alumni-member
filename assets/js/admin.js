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

// Admin modules V1.0.15
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
  if(name==='payments') loadAdminTransactions('payment');
  if(name==='donations') loadAdminTransactions('donation');
  if(name==='news') loadAdminNews();
  if(name==='media') loadMedia();
  if(name==='webmanage'){initWebManager();loadHomeContentAdmin();}
  if(name==='accounting') loadAccounting();
  if(name==='reports') loadAccountingReport();
  if(name==='settings') loadSettings();if(name==='topics') loadAdminTopics();
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
  const imageFile=$('#newsImageInput')?.files?.[0]||null;
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
    const newsPayload={token:adminToken,requestId,newsId:f.newsId.value,category:f.category.value,title,content,active:f.active.checked};
    if(imageFile){newsPayload.imageDataUrl=await fileToDataUrl(imageFile);newsPayload.imageName=imageFile.name;}
    await api('adminSaveNews',newsPayload);
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

async function loadAdminTopics(){try{const o=await api('adminTopicsList',{token:adminToken});const render=(host,rows,type)=>{$(host).innerHTML=(rows||[]).map(x=>`<div class="topic-row"><div><b>${escapeHtml(x.title)}</b>${type==='payment'?`<small>${Number(x.amount||0).toLocaleString('th-TH')} บาท</small>`:''}</div><button class="btn btn-danger" onclick="deleteAdminTopic('${type}','${escapeHtml(x.id)}')">ลบ</button></div>`).join('')||'<div class="empty">ยังไม่มีหัวข้อ</div>';};render('#paymentTopicList',o.paymentTopics,'payment');render('#donationTopicList',o.donationTopics,'donation');}catch(e){uiAlert('โหลดหัวข้อไม่สำเร็จ',e.message,'error');}}
document.addEventListener('DOMContentLoaded',()=>{$('#paymentTopicForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;await api('adminSaveTopic',{token:adminToken,type:'payment',title:f.title.value,amount:f.amount.value});f.reset();loadAdminTopics();});$('#donationTopicForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;await api('adminSaveTopic',{token:adminToken,type:'donation',title:f.title.value});f.reset();loadAdminTopics();});});
async function deleteAdminTopic(type,id){if(!(await uiConfirm('ลบหัวข้อ','ยืนยันการลบ?')))return;await api('adminDeleteTopic',{token:adminToken,type,id});loadAdminTopics();}

async function loadFinanceSummary(){try{const o=await api('adminFinanceSummary',{token:adminToken}),s=o.summary||{};if($('#sumPaymentCount'))$('#sumPaymentCount').textContent=Number(s.paymentCount||0).toLocaleString('th-TH');if($('#sumPaymentAmount'))$('#sumPaymentAmount').textContent=Number(s.paymentAmount||0).toLocaleString('th-TH')+' บาท';if($('#sumDonationCount'))$('#sumDonationCount').textContent=Number(s.donationCount||0).toLocaleString('th-TH');if($('#sumDonationAmount'))$('#sumDonationAmount').textContent=Number(s.donationAmount||0).toLocaleString('th-TH')+' บาท';}catch(e){console.warn(e)}}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{if(typeof adminToken!=='undefined'&&adminToken)loadFinanceSummary();},800);});

async function loadAdminTransactions(type){
  const host=type==='payment'?$('#adminPaymentList'):$('#adminDonationList');
  if(!host)return;
  host.innerHTML='<div class="empty">กำลังโหลด...</div>';
  try{
    const o=await api('adminTransactionsList',{token:adminToken,type});
    const rows=o.rows||[];
    host.innerHTML=rows.length?rows.map(x=>`<article class="transaction-card">
      <div class="transaction-main">
        <div class="transaction-title"><b>${escapeHtml(x.id)}</b><span class="status-badge ${statusClass(x.status)}">${escapeHtml(x.status)}</span></div>
        <div class="transaction-grid">
          <div><small>${type==='payment'?'สมาชิก':'ผู้บริจาค'}</small><strong>${escapeHtml(x.memberCode||x.donorName||'-')}</strong></div>
          <div><small>หัวข้อ</small><strong>${escapeHtml(x.topic||'-')}</strong></div>
          <div><small>จำนวนเงิน</small><strong>${Number(x.amount||0).toLocaleString('th-TH')} บาท</strong></div>
          <div><small>วันเวลาโอน</small><strong>${escapeHtml(formatDate(x.date))}</strong></div>
        </div>
      </div>
      <div class="transaction-actions">
        ${x.slipUrl?`<a class="btn btn-view" href="${escapeHtml(x.slipUrl)}" target="_blank">ดูสลิป</a>`:''}
        <button class="btn btn-soft" onclick="verifyTransaction('${type}','${escapeHtml(x.id)}','อนุมัติ')">✓ อนุมัติ</button>
        <button class="btn btn-danger" onclick="verifyTransaction('${type}','${escapeHtml(x.id)}','ไม่อนุมัติ')">ไม่อนุมัติ</button>
      </div>
    </article>`).join(''):'<div class="empty">ยังไม่มีรายการ</div>';
  }catch(e){host.innerHTML='<div class="empty">โหลดไม่สำเร็จ</div>';uiAlert('โหลดรายการไม่สำเร็จ',e.message,'error');}
}
async function verifyTransaction(type,id,decision){
  if(!(await uiConfirm(decision==='อนุมัติ'?'ยืนยันรายการ':'ไม่อนุมัติรายการ',`${decision} ${id} ?`)))return;
  try{
    setLoading(true);
    const o=await api('adminVerifyTransaction',{token:adminToken,type,id,decision});
    await uiAlert('บันทึกแล้ว',o.message||'อัปเดตสถานะเรียบร้อย','success');
    await loadAdminTransactions(type);
    await loadFinanceSummary();
    if(type==='payment') await refreshDashboard();
  }catch(e){uiAlert('บันทึกไม่สำเร็จ',e.message,'error');}
  finally{setLoading(false);}
}


function initWebManager(){
  [['#legacyNewsPanel','#webNewsMount'],['#legacyMediaPanel','#webMediaMount'],['#legacyTopicsPanel','#webTopicsMount']].forEach(([src,dst])=>{const s=$(src),d=$(dst);if(s&&d&&s.parentElement!==d){s.classList.remove('hidden');s.removeAttribute('data-admin-panel');d.appendChild(s);}});
  document.querySelectorAll('[data-web-sub]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-web-sub]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('[data-web-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.webPanel!==btn.dataset.webSub));if(btn.dataset.webSub==='news')loadAdminNews();if(btn.dataset.webSub==='media')loadAdminMedia();if(btn.dataset.webSub==='topics')loadAdminTopics();if(btn.dataset.webSub==='homecontent')loadHomeContentAdmin();});
}
async function loadHomeContentAdmin(){try{const o=await api('adminHomeContentGet',{token:adminToken}),c=o.content||{},f=$('#homeContentForm');if(!f)return;['heroChip','heroTitle','heroSub','heroQuote','quoteText'].forEach(k=>{if(f.elements[k])f.elements[k].value=c[k]||'';});}catch(e){uiAlert('โหลดข้อความหน้าเว็บไม่สำเร็จ',e.message,'error');}}
document.addEventListener('DOMContentLoaded',()=>{
 $('#homeContentForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,p={token:adminToken};['heroChip','heroTitle','heroSub','heroQuote','quoteText'].forEach(k=>p[k]=f.elements[k].value);try{await api('adminHomeContentSave',p);await uiAlert('บันทึกแล้ว','อัปเดตข้อความหน้าเว็บเรียบร้อย','success');}catch(err){uiAlert('บันทึกไม่สำเร็จ',err.message,'error');}});
 $('#accountingForm')?.addEventListener('submit',saveAccountingEntry);$('#accountingSearch')?.addEventListener('input',renderAccountingRows);$('#accountingTypeFilter')?.addEventListener('change',renderAccountingRows);$('#reportRunBtn')?.addEventListener('click',loadAccountingReport);$('#reportPreset')?.addEventListener('change',()=>{applyReportPreset();loadAccountingReport();});
});
let accountingRows=[];
async function saveAccountingEntry(e){e.preventDefault();const f=e.currentTarget;try{const p={token:adminToken};['type','date','category','source','amount','reference','note'].forEach(k=>p[k]=f.elements[k].value);await api('adminAccountingSave',p);f.reset();await uiAlert('บันทึกแล้ว','เพิ่มรายการบัญชีเรียบร้อย','success');loadAccounting();}catch(err){uiAlert('บันทึกไม่สำเร็จ',err.message,'error');}}
async function loadAccounting(){try{const o=await api('adminAccountingList',{token:adminToken});accountingRows=o.rows||[];renderAccountingRows();const f=$('#accountingForm');if(f&&f.elements.date&&!f.elements.date.value)f.elements.date.value=new Date().toISOString().slice(0,10);}catch(e){uiAlert('โหลดบัญชีไม่สำเร็จ',e.message,'error');}}
function renderAccountingRows(){const host=$('#accountingList');if(!host)return;const q=String($('#accountingSearch')?.value||'').toLowerCase(),type=$('#accountingTypeFilter')?.value||'';const rows=accountingRows.filter(x=>(!type||x.type===type)&&(!q||[x.category,x.source,x.reference,x.note].join(' ').toLowerCase().includes(q)));host.innerHTML=rows.length?rows.map(x=>`<div class="account-row ${x.type==='รายรับ'?'income':'expense'}"><div><b>${escapeHtml(x.type)}</b><small>${escapeHtml(x.date||'')}</small></div><div><b>${escapeHtml(x.category||'-')}</b><small>${escapeHtml(x.source||'-')}</small></div><div><b>${Number(x.amount||0).toLocaleString('th-TH')} บาท</b><small>${escapeHtml(x.reference||'')}</small></div><div><small>${escapeHtml(x.note||'')}</small></div><button class="btn btn-danger" onclick="deleteAccountingEntry('${escapeHtml(x.id)}')">ลบ</button></div>`).join(''):'<div class="empty">ยังไม่มีรายการบัญชี</div>';}
async function deleteAccountingEntry(id){if(!(await uiConfirm('ลบรายการบัญชี','ยืนยันการลบรายการนี้?')))return;try{await api('adminAccountingDelete',{token:adminToken,id});loadAccounting();}catch(e){uiAlert('ลบไม่สำเร็จ',e.message,'error');}}
function applyReportPreset(){const preset=$('#reportPreset')?.value||'custom',from=$('#reportFrom'),to=$('#reportTo');if(!from||!to||preset==='custom')return;const d=new Date(),fmt=x=>{const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};if(preset==='all'){from.value='';to.value='';return;}if(preset==='today'){from.value=to.value=fmt(d);return;}if(preset==='month'){from.value=fmt(new Date(d.getFullYear(),d.getMonth(),1));to.value=fmt(new Date(d.getFullYear(),d.getMonth()+1,0));return;}if(preset==='year'){from.value=fmt(new Date(d.getFullYear(),0,1));to.value=fmt(new Date(d.getFullYear(),11,31));}}
async function loadAccountingReport(){try{applyReportPreset();const o=await api('adminAccountingReport',{token:adminToken,from:$('#reportFrom')?.value||'',to:$('#reportTo')?.value||''}),r=o.report||{};if($('#reportIncome'))$('#reportIncome').textContent=Number(r.income||0).toLocaleString('th-TH');if($('#reportExpense'))$('#reportExpense').textContent=Number(r.expense||0).toLocaleString('th-TH');if($('#reportNet'))$('#reportNet').textContent=Number(r.net||0).toLocaleString('th-TH');const host=$('#reportBreakdown');if(host)host.innerHTML=(r.byCategory||[]).map(x=>`<div class="report-row"><span>${escapeHtml(x.type)} · ${escapeHtml(x.category)}</span><b>${Number(x.amount||0).toLocaleString('th-TH')} บาท</b></div>`).join('')||'<div class="empty">ยังไม่มีข้อมูลในช่วงนี้</div>';}catch(e){uiAlert('ประมวลผลรายงานไม่สำเร็จ',e.message,'error');}}
