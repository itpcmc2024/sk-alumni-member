/*
 SK Alumni Member System V1.0.17
 Smart donation/payment form
*/
document.addEventListener('DOMContentLoaded',()=>initDonationForm());

async function initDonationForm(){
  const form=$('#donationForm'); if(!form)return;
  const submit=$('#donationSubmitBtn'), consent=form.elements.consent;
  const dateInput=form.elements.donatedAt;
  const code=$('#donorMemberCode'), name=$('#donorName'), phone=$('#donorPhone'), email=$('#donorEmail');
  const status=$('#memberLookupStatus');
  let lookupTimer=null, verifiedMember='';

  if(dateInput&&!dateInput.value){
    const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
    dateInput.value=d.toISOString().slice(0,16);
  }

  function donorType(){ return form.elements.donorType.value; }
  function syncMode(){
    const member=donorType()==='member';
    $('#memberLookupBox').classList.toggle('hidden',!member);
    [name,phone,email].forEach(x=>x.readOnly=member);
    document.querySelectorAll('.donor-type-option').forEach(x=>{
      const radio=x.querySelector('input');
      x.classList.toggle('active',radio.checked);
    });
    if(!member){
      verifiedMember='';
      code.value='';
      status.textContent='';
      [name,phone,email].forEach(x=>{x.value='';x.readOnly=false;});
    }else{
      [name,phone,email].forEach(x=>x.readOnly=true);
      status.textContent='กรอกรหัสสมาชิก ระบบจะดึงข้อมูลให้อัตโนมัติ';
    }
    syncSubmit();
  }

  function syncSubmit(){
    const memberOkay=donorType()==='public' || verifiedMember===code.value.trim().toUpperCase();
    submit.disabled=!consent.checked || !memberOkay;
    submit.classList.toggle('is-disabled',submit.disabled);
  }

  form.querySelectorAll('input[name="donorType"]').forEach(r=>r.addEventListener('change',syncMode));
  consent.addEventListener('change',syncSubmit);

  async function lookupMember(){
    if(donorType()!=='member')return;
    const memberCode=code.value.trim().toUpperCase();
    code.value=memberCode;
    verifiedMember='';
    [name,phone,email].forEach(x=>x.value='');
    syncSubmit();

    if(!/^\d{2}-SK\d{4}$/.test(memberCode)){
      status.textContent='รูปแบบรหัสสมาชิก เช่น 69-SK0001';
      status.className='member-lookup-status';
      return;
    }
    status.textContent='กำลังค้นหาข้อมูลสมาชิก...';
    status.className='member-lookup-status loading';
    try{
      const out=await api('publicMemberLookup',{memberCode});
      const m=out.member;
      name.value=((m.prefix||'')+' '+(m.fullName||'')).trim();
      phone.value=m.phone||'';
      email.value=m.email||'';
      verifiedMember=memberCode;
      status.textContent=`พบสมาชิก ${m.memberCode} • ${m.status||''}`;
      status.className='member-lookup-status success';
    }catch(err){
      status.textContent=err.message||'ไม่พบสมาชิก';
      status.className='member-lookup-status error';
    }
    syncSubmit();
  }

  code.addEventListener('input',()=>{
    code.value=code.value.toUpperCase().replace(/\s/g,'').slice(0,9);
    clearTimeout(lookupTimer);
    lookupTimer=setTimeout(()=>{if(code.value.length===9)lookupMember();},400);
  });
  code.addEventListener('blur',lookupMember);

  try{
    const out=await api('publicDonationTopics',{});
    const topics=out.topics||[];
    $('#donationTopic').innerHTML='<option value="">-- เลือกหัวข้อ --</option>'+
      topics.map(t=>`<option value="${escapeHtml(t.topicId)}">${escapeHtml(t.title)}</option>`).join('');
  }catch(err){
    $('#donationTopic').innerHTML='<option value="">-- โหลดหัวข้อไม่สำเร็จ --</option>';
    await uiAlert('โหลดหัวข้อไม่สำเร็จ',err.message,'warning');
  }

  $('#donationSlip').addEventListener('change',e=>{
    const file=e.target.files[0];
    if(!file){$('#slipPreviewBox').classList.add('hidden');return;}
    if(file.size>3*1024*1024){
      e.target.value='';
      $('#slipPreviewBox').classList.add('hidden');
      uiAlert('ไฟล์ใหญ่เกินไป','กรุณาเลือกสลิปขนาดไม่เกิน 3 MB','warning');
      return;
    }
    const url=URL.createObjectURL(file);
    $('#slipPreview').src=url;
    $('#slipPreviewBox').classList.remove('hidden');
  });

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(form.dataset.saving==='1')return;
    if(!form.checkValidity()){form.reportValidity();return;}
    if(donorType()==='member' && verifiedMember!==code.value.trim().toUpperCase()){
      await uiAlert('ยังไม่พบข้อมูลสมาชิก','กรุณากรอกรหัสสมาชิกที่ถูกต้อง','warning');return;
    }
    const slip=$('#donationSlip').files[0];
    if(!slip){await uiAlert('ยังไม่มีสลิป','กรุณาแนบสลิปการโอนเงิน','warning');return;}

    form.dataset.saving='1'; submit.disabled=true;
    const old=submit.textContent; submit.textContent='กำลังส่งข้อมูล...';
    try{
      setLoading(true);
      const fd=new FormData(form), payload=Object.fromEntries(fd.entries());
      delete payload.slip;
      payload.slipDataUrl=await fileToDataUrl(slip);
      payload.slipName=slip.name;
      payload.requestId=`DON-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const out=await api('submitDonation',payload);
      await uiAlert('รับข้อมูลแล้ว 💚',
        `เลขที่รายการ: ${out.donationId}\nจำนวนเงิน: ${Number(out.amount||0).toLocaleString('th-TH')} บาท\nสถานะ: ${out.status}`,
        'success');
      form.reset(); verifiedMember='';
      const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
      dateInput.value=d.toISOString().slice(0,16);
      $('#slipPreviewBox').classList.add('hidden');
      syncMode();
    }catch(err){
      await uiAlert('ส่งข้อมูลไม่สำเร็จ',err.message||String(err),'error');
    }finally{
      setLoading(false); form.dataset.saving='0'; submit.textContent=old; syncSubmit();
    }
  });

  syncMode();
}
