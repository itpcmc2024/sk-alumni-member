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
      <select data-status="${escapeHtml(m.memberCode)}">
        ${['รอตรวจสอบข้อมูล','รอชำระค่าสมาชิก','รอตรวจสอบการชำระ','สมาชิกสมบูรณ์','ไม่อนุมัติ'].map(s=>`<option ${s===m.status?'selected':''}>${s}</option>`).join('')}
      </select>
      <button class="btn btn-soft" onclick="saveStatus('${escapeHtml(m.memberCode)}')">บันทึก</button>
      <button class="btn btn-danger" onclick="deleteMember('${escapeHtml(m.memberCode)}','${escapeHtml(m.fullName).replace(/'/g,"&#39;")}')">ลบ</button>
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
