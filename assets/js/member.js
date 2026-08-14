document.addEventListener('DOMContentLoaded',()=>{
  const form=$('#memberPortalGatewayForm');
  const saved=sessionStorage.getItem('sk_member_code')||'';
  if(saved&&$('#gatewayMemberCode'))$('#gatewayMemberCode').value=saved;
  form?.addEventListener('submit',async e=>{
    e.preventDefault();
    const memberCode=$('#gatewayMemberCode').value.trim().toUpperCase(),identifier=$('#gatewayIdentifier').value.trim();
    if(!memberCode||!identifier)return uiAlert('กรอกข้อมูลไม่ครบ','กรุณากรอกรหัสสมาชิก และอีเมลหรือเบอร์โทรศัพท์','warning');
    try{
      setLoading(true);
      const out=await api('memberPortalLogin',{memberCode,identifier});
      sessionStorage.setItem('sk_member_portal_session',out.session);
      sessionStorage.setItem('sk_member_portal_data',JSON.stringify(out));
      sessionStorage.setItem('sk_member_code',memberCode);
      location.href='portal.html';
    }catch(err){
      await uiAlert('ยังไม่สามารถเข้าสู่ข้อมูลสมาชิก',err.message,'warning');
      if(/อยู่ระหว่าง/.test(err.message))sessionStorage.setItem('sk_member_code',memberCode);
    }finally{setLoading(false);}
  });
});
