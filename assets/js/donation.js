/*
 SK Alumni Member System V1.0.10
 Donation form
*/
document.addEventListener('DOMContentLoaded',()=>{
  initDonationForm();
});

async function initDonationForm(){
  const form=$('#donationForm');
  if(!form) return;
  const submit=$('#donationSubmitBtn');
  const consent=form.elements.consent;
  const dateInput=form.elements.donatedAt;

  if(dateInput && !dateInput.value){
    const d=new Date();
    d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
    dateInput.value=d.toISOString().slice(0,16);
  }

  function syncSubmit(){
    submit.disabled=!consent.checked;
    submit.classList.toggle('is-disabled',!consent.checked);
  }
  consent.addEventListener('change',syncSubmit);
  syncSubmit();

  try{
    const out=await api('publicDonationTopics',{});
    const topics=out.topics||[];
    $('#donationTopic').innerHTML='<option value="">-- เลือกหัวข้อการบริจาค --</option>'+
      topics.map(t=>`<option value="${escapeHtml(t.topicId)}">${escapeHtml(t.title)}</option>`).join('');
  }catch(err){
    $('#donationTopic').innerHTML='<option value="">บริจาคทั่วไป</option>';
    await uiAlert('โหลดหัวข้อบริจาคไม่สำเร็จ',err.message,'warning');
  }

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(form.dataset.saving==='1') return;
    if(!form.checkValidity()){ form.reportValidity(); return; }
    const slip=$('#donationSlip').files[0];
    if(!slip){ await uiAlert('ยังไม่มีสลิป','กรุณาแนบสลิปการโอนเงิน','warning'); return; }

    form.dataset.saving='1';
    submit.disabled=true;
    const old=submit.textContent;
    submit.textContent='กำลังส่งข้อมูล...';
    try{
      setLoading(true);
      const fd=new FormData(form);
      const payload=Object.fromEntries(fd.entries());
      delete payload.slip;
      payload.slipDataUrl=await fileToDataUrl(slip);
      payload.slipName=slip.name;
      payload.requestId=`DON-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const out=await api('submitDonation',payload);
      await uiAlert('รับข้อมูลการบริจาคแล้ว 💚',
        `เลขที่รายการ: ${out.donationId}\nจำนวนเงิน: ${Number(out.amount||0).toLocaleString('th-TH')} บาท\nสถานะ: ${out.status}`,
        'success');
      form.reset();
      if(dateInput){
        const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
        dateInput.value=d.toISOString().slice(0,16);
      }
      syncSubmit();
    }catch(err){
      await uiAlert('ส่งข้อมูลไม่สำเร็จ',err.message||String(err),'error');
    }finally{
      setLoading(false);
      form.dataset.saving='0';
      submit.textContent=old;
      syncSubmit();
    }
  });
}
