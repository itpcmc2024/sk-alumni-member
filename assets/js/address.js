/*
 SK Alumni Member System V1.0.3
 Dependent Thai address selector:
 Postal code -> Province -> Amphoe/District -> Tambon/Subdistrict

 Data source:
 earthchie/jquery.Thailand.js raw_database.json (WTFPL 2.0)
*/
const SK_THAI_ADDRESS_DB =
  'https://raw.githubusercontent.com/earthchie/jquery.Thailand.js/master/jquery.Thailand.js/database/raw_database/raw_database.json';

let SK_ADDRESS_ROWS = [];

function uniqSorted(values){
  return [...new Set(values.filter(v => v !== undefined && v !== null && String(v).trim() !== '')
    .map(v => String(v).trim()))].sort((a,b)=>a.localeCompare(b,'th'));
}

function setSelectOptions(select, values, placeholder){
  if(!select) return;
  select.innerHTML = `<option value="">${placeholder}</option>` +
    values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  select.disabled = values.length === 0;
}

function autoPickIfSingle(select){
  if(select && select.options.length === 2){
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    return true;
  }
  return false;
}

async function initThaiAddressSelector(){
  const zip = document.querySelector('#postalCodeSelect');
  const province = document.querySelector('#provinceSelect');
  const amphoe = document.querySelector('#districtSelect');
  const tambon = document.querySelector('#subdistrictSelect');
  const status = document.querySelector('#addressDbStatus');
  if(!zip || !province || !amphoe || !tambon) return;

  try{
    if(status) status.textContent = 'กำลังโหลดฐานข้อมูลที่อยู่...';
    const response = await fetch(SK_THAI_ADDRESS_DB, {cache:'force-cache'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    SK_ADDRESS_ROWS = rows.map(r => ({
      zipcode: String(r.zipcode || '').padStart(5,'0'),
      province: String(r.province || '').trim(),
      amphoe: String(r.amphoe || '').trim(),
      district: String(r.district || '').trim()
    })).filter(r => r.zipcode && r.province && r.amphoe && r.district);

    const zips = uniqSorted(SK_ADDRESS_ROWS.map(r=>r.zipcode)).sort((a,b)=>Number(a)-Number(b));
    setSelectOptions(zip,zips,'-- เลือกรหัสไปรษณีย์ --');
    if(status){
      status.textContent = `พร้อมใช้งาน • ${zips.length.toLocaleString('th-TH')} รหัสไปรษณีย์`;
      status.classList.add('ready');
    }
  }catch(err){
    console.error('Address DB load failed',err);
    if(status){
      status.textContent = 'โหลดฐานข้อมูลที่อยู่ไม่สำเร็จ';
      status.classList.add('error');
    }
    zip.disabled = province.disabled = amphoe.disabled = tambon.disabled = true;
    if(typeof uiAlert === 'function'){
      uiAlert('ฐานข้อมูลที่อยู่ยังไม่พร้อม','ไม่สามารถโหลดฐานข้อมูลที่อยู่ประเทศไทยได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้าอีกครั้ง','warning');
    }
    return;
  }

  zip.addEventListener('change',()=>{
    const rows = SK_ADDRESS_ROWS.filter(r=>r.zipcode===zip.value);
    setSelectOptions(province, uniqSorted(rows.map(r=>r.province)), '-- เลือกจังหวัด --');
    setSelectOptions(amphoe, [], '-- เลือกอำเภอ / เขต --');
    setSelectOptions(tambon, [], '-- เลือกตำบล / แขวง --');
    autoPickIfSingle(province);
  });

  province.addEventListener('change',()=>{
    const rows = SK_ADDRESS_ROWS.filter(r=>r.zipcode===zip.value && r.province===province.value);
    setSelectOptions(amphoe, uniqSorted(rows.map(r=>r.amphoe)), '-- เลือกอำเภอ / เขต --');
    setSelectOptions(tambon, [], '-- เลือกตำบล / แขวง --');
    autoPickIfSingle(amphoe);
  });

  amphoe.addEventListener('change',()=>{
    const rows = SK_ADDRESS_ROWS.filter(r=>
      r.zipcode===zip.value && r.province===province.value && r.amphoe===amphoe.value
    );
    setSelectOptions(tambon, uniqSorted(rows.map(r=>r.district)), '-- เลือกตำบล / แขวง --');
    autoPickIfSingle(tambon);
  });
}

document.addEventListener('DOMContentLoaded', initThaiAddressSelector);
