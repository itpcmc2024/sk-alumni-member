SK Alumni Member System V1.0.2 - Hybrid
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

สิ่งที่มีใน V1.0.2
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

ยังไม่รวมใน V1.0.2
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

เวอร์ชัน: V1.0.2


Repository:
https://github.com/itpcmc2024/sk-alumni-member

GAS Web App:
https://script.google.com/macros/s/AKfycbyvMLHGrhtRsrHJC_A0TRB7-GPmS9FFICHI_Soo6X0qwPYRC7ishqmdA9E9M5G30BVfXQ/exec

V1.0.2: Approved homepage, original logo/mosque/QR assets, copyright by KimhanIkals.
