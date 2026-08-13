SK Alumni Member System V1.0.12 - Hybrid
================================================
Frontend : GitHub Pages
Backend  : Google Apps Script
Database : Google Sheets
Files    : Google Drive

โครงสร้าง
---------
index.html
admin.html
member.html
assets/css/style.css
assets/js/app.js
assets/js/admin.js
assets/js/member.js
gas/Code.gs
gas/appsscript.json

ค่าที่ฝังใน Backend
-------------------
Spreadsheet ID:
1gmAY0BC-Lr8ud0TU477uHR3QQetybo_QuMYb5Guty5U

Drive Folder ID:
1EZgMkQg6ccraioifsfQqaPENUT4VGNYQ

ขั้นตอนติดตั้งแบบสั้น
--------------------
1. GitHub:
   วาง index.html / admin.html / member.html / assets ทั้งหมดที่ root ของ repo sk-alumni-member

2. Google Apps Script:
   - สร้าง/เปิด Apps Script Project
   - วาง gas/Code.gs
   - ถ้าต้องการใช้ manifest ให้เปิด Project Settings > Show appsscript.json แล้ววางไฟล์ gas/appsscript.json
   - Run setupSystem() 1 ครั้ง และอนุญาตสิทธิ์

3. Deploy GAS:
   Deploy > New deployment > Web app
   Execute as: Me
   Who has access: Anyone
   Copy URL ที่ลงท้าย /exec

4. เชื่อม GitHub กับ GAS:
   เปิด assets/js/app.js
   เปลี่ยน:
   API_URL: 'https://script.google.com/macros/s/AKfycbyvMLHGrhtRsrHJC_A0TRB7-GPmS9FFICHI_Soo6X0qwPYRC7ishqmdA9E9M5G30BVfXQ/exec'
   เป็น:
   API_URL: 'https://script.google.com/macros/s/......../exec'

5. เปิด GitHub Pages:
   Settings > Pages
   Deploy from a branch
   Branch: main / root
   Save

6. Admin ทดสอบ:
   Username: admin
   Password: admin1234

7. หลังทดสอบผ่าน:
   เปลี่ยนรหัสผ่าน Admin โดยใช้ changeDefaultAdminPassword() ตามคำอธิบายใน Code.gs

สิ่งที่มีใน V1.0.12
-----------------
- หน้าแรก Responsive ขาว-เขียวพาสเทล
- สมัครสมาชิก 3 Step
- รหัสสมาชิกอัตโนมัติ 69-SK0001
- ที่อยู่แยก บ้านเลขที่/หมู่/ซอย/ถนน/ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์
- อัปโหลดรูปเข้า Google Drive
- ตรวจสอบสถานะ
- Member Portal ขั้นพื้นฐาน
- Admin Login
- Dashboard + ค้นหา/กรอง
- เปลี่ยนสถานะสมาชิก
- ลบสมาชิก + Audit Log
- Tabs โครงสร้างสำหรับ Payment/Donation/Benefit/News/Accounting เตรียมไว้แล้ว

ยังไม่รวมใน V1.0.12
------------------
- LINE LIFF
- ระบบค้นหาที่อยู่จากฐานรหัสไปรษณีย์
- QR Payment / PromptPay
- ตรวจสลิป/ยืนยันการชำระ
- PDF หลักฐานสมาชิก
- ส่ง Email
- บริจาคเต็มระบบ
- สิทธิประโยชน์เต็มระบบ
- บัญชีรายรับ-รายจ่าย/รายงานเต็มระบบ

เวอร์ชัน: V1.0.12


Repository:
https://github.com/itpcmc2024/sk-alumni-member

GAS Web App:
https://script.google.com/macros/s/AKfycbyvMLHGrhtRsrHJC_A0TRB7-GPmS9FFICHI_Soo6X0qwPYRC7ishqmdA9E9M5G30BVfXQ/exec

V1.0.12: Approved homepage, original logo/mosque/QR assets, copyright by KimhanIkals.

V1.0.12 - Address & UX Fix
--------------------------
1. mosque-reference.jpg แสดงด้วย <img> โดยตรง ไม่พึ่ง CSS relative background path
2. ที่อยู่เลือกแบบ รหัสไปรษณีย์ -> จังหวัด -> อำเภอ/เขต -> ตำบล/แขวง
   Data source: earthchie/jquery.Thailand.js raw_database.json
3. Phone / PostalCode / HouseNo / Bank Account fields ตั้งเป็น Plain Text เพื่อรักษา 0 นำหน้า
4. Step 3 ซ่อนปุ่ม "ถัดไป" เหลือเฉพาะ "ยืนยันการสมัคร"
5. Alert/Confirm เปลี่ยนเป็น Modal UI
6. Admin ทดสอบ: username admin / password admin1234

V1.0.12: searchable postcode, admin detail, print/save PDF, pastel status cards.

V1.0.12 - Multi Page + Admin Phase 1
- register.html / status.html แยกหน้า
- ทุกหน้ามี Header + Footer
- ปุ่มยืนยันสมัคร disabled จนกว่าจะติ๊ก Consent
- Footer logo กลมกลืนกับ footer
- Admin controls อยู่แถวเดียว
- รูปสมาชิกปรับเป็น Drive thumbnail + public link; มี repairMemberPhotoSharing()
- Admin: Members / News CRUD / Media list / Settings

V1.0.12: member detail layout, print fixes, news fixed scroll, register steps moved, payment/donation pages, member sort/pagination, Settings text format.

V1.0.12 - Cute Homepage & News Fix
---------------------------------
- Remove registration-step / payment cards from homepage
- Refresh feature cards with cute friendly visual icons
- Homepage news uses compact fixed-height 4-row list + View All
- Fix admin news save, disable button while saving
- GAS requestId + LockService + recent duplicate protection

V1.0.12 - Cute Visual Polish
---------------------------
- Homepage registration-step and QR/payment block removed completely.
- Homepage news displays only 3 items in a compact fixed-height panel.
- Dashboard row no longer stretches to the height of the news panel.
- Six cute homepage card illustrations are included as local assets under assets/img/menu/.
- Illustrations are derived from the approved homepage visual reference, so GitHub Pages does not depend on external image hosts.
- News anti-double-submit behavior from V1.0.8 is retained.

V1.0.12 - Cute Assets + Donation Form
--------------------------------------
- Cute homepage art moved to assets/img root: cute-register/status/payment/donation/benefits/news.jpg
- Register journey has four illustrated cards again.
- Homepage news renders all returned news; about 3 are visible and overflow scrolls inside the panel.
- Donation page now has donor form, donation topic, amount, transfer date, slip upload, QR and submit flow.
- GAS adds publicDonationTopics + submitDonation, saves slips to DonationSlips and donation rows to Donations.
- Donation topics are seeded on setupSystem().

V1.0.12 - Embedded Cute + Smart Donation
-----------------------------------------
- Cute menu and registration-step illustrations are embedded directly into HTML as WebP data URIs.
  This removes dependency on uploading separate cute image files to GitHub.
- Donation topics are exactly: ชำระค่าสมาชิก / กองทุนการศึกษา / กิจกรรมสมาคม.
- Donation form has Member / Public modes.
- Member mode auto-fills name, phone and email from member code.
- Public mode keeps contact fields editable.
- Slip preview is shown before submit.
- Slip authenticity verification is not enabled yet; integration point is reserved for a verification API.

V1.0.12
- News category colors + optional news thumbnail upload.
- Correct homepage counters: total / this year / new this month / activities this year.
- Softer hero background; no large hero logo; header logo styled like footer.
- Smart member-only payment form with member lookup and slip upload.
- Admin can add payment/donation topics.
- Donation topics: สมทบกองทุนการศึกษา / เพื่อกิจกรรมสมาคม / กิจการอื่นๆ.
