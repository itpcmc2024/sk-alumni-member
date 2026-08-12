document.addEventListener('DOMContentLoaded', ()=>{
  $('#memberLookupForm').addEventListener('submit', lookupMember);
});
async function lookupMember(e){
  e.preventDefault();
  try{
    setLoading(true);
    const fd=new FormData(e.currentTarget);
    const out=await api('memberProfile',Object.fromEntries(fd.entries()));
    const m=out.member;
    $('#memberProfile').classList.remove('hidden');
    $('#memberName').textContent=m.fullName;
    $('#memberArabic').textContent=m.arabicName || '—';
    $('#memberCode').textContent=m.memberCode;
    $('#memberStatusBadge').textContent=m.status;
    $('#memberStatusBadge').className='status-badge '+statusClass(m.status);
    const av=$('#memberAvatar');
    if(m.photoUrl){ av.style.backgroundImage=`url("${m.photoUrl}")`; av.textContent=''; } else { av.style.backgroundImage=''; av.textContent='SK'; }
    $('#memberInfo').innerHTML=`<div class="detail-list">
      <div class="detail-row"><span>รหัสสมาชิก</span><b>${escapeHtml(m.memberCode)}</b></div>
      <div class="detail-row"><span>ชื่อ-สกุล</span><b>${escapeHtml(m.fullName)}</b></div>
      <div class="detail-row"><span>ชื่ออาหรับ</span><b>${escapeHtml(m.arabicName||'-')}</b></div>
      <div class="detail-row"><span>อีเมล</span><b>${escapeHtml(m.email)}</b></div>
      <div class="detail-row"><span>โทรศัพท์</span><b>${escapeHtml(m.phone||'-')}</b></div>
      <div class="detail-row"><span>ที่อยู่</span><b>${escapeHtml(m.addressText||'-')}</b></div>
      <div class="detail-row"><span>วันที่สมัคร</span><b>${escapeHtml(formatDate(m.registeredAt))}</b></div>
    </div>`;
    window.scrollTo({top:$('#memberProfile').offsetTop-90,behavior:'smooth'});
  }catch(err){$('#memberProfile').classList.add('hidden');toast(err.message,'error');}finally{setLoading(false);}
}
