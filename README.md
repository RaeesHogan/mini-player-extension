# Mini Player Extension

Mini Player Extension เป็น Chrome Extension ที่เปิดวิดีโอจากแท็บปัจจุบันในหน้าต่างแยกแบบ popup window โดยใช้ tab capture และ WebRTC stream เพื่อให้คุณดูวิดีโอพร้อมควบคุม play/pause, seek, mute และจำตำแหน่งเล่นล่าสุด

## ฟีเจอร์หลัก
- เปิดวิดีโอจากแท็บปัจจุบันในหน้าต่างแยก
- Play/Pause และ Seek
- แสดงเวลาเล่น/ความยาววิดีโอ
- จำตำแหน่ง playback ล่าสุด
- จำตำแหน่งและขนาดหน้าต่างล่าสุด
- ปุ่ม toggle สำหรับสถานะ mute และตัวเลือก Always on Top (แบบสถานะใน UI)
- UI แบบ Dark theme ภาษาไทย

## วิธีติดตั้ง
1. เปิด Chrome และไปที่ chrome://extensions/
2. เปิด Developer mode
3. คลิก Load unpacked
4. เลือกโฟลเดอร์ที่มีไฟล์ extension นี้
5. เปิด extension จากแถบเครื่องมือ และกดปุ่มเปิดหน้าต่างแยก

## วิธีใช้งาน
1. เปิดเว็บไซต์ที่มีวิดีโอ เช่น YouTube
2. คลิกไอคอน extension
3. กดปุ่ม เปิดหน้าต่างแยก
4. หน้าต่าง Mini Player จะเปิดขึ้นมาและเริ่มสตรีมวิดีโอจากแท็บปัจจุบัน
5. ใช้ปุ่มควบคุมบนหน้าต่างแยกเพื่อเล่น/หยุด, เลื่อนเวลาและปิดเสียง

## ข้อจำกัดที่ควรรู้
- Chrome MV3 ไม่มี API แบบ native สำหรับ Always on Top โดยตรง ดังนั้นปุ่ม toggle จะเป็นตัวแสดงสถานะและอาจต้องรีสตาร์ทหน้าต่างเพื่อให้ผลลัพธ์ชัดเจน
- การ capture ทำงานได้ดีกับเว็บทั่วไปและ YouTube แต่บางเว็บไซต์ที่ใช้ DRM เช่น Netflix หรือ Disney+ อาจไม่รองรับ
- บางไซต์อาจปิด autoplay ทำให้ต้องกดเล่นเองครั้งแรก

## ไฟล์หลัก
- [manifest.json](manifest.json)
- [background.js](background.js)
- [content.js](content.js)
- [popup.html](popup.html)
- [popup.js](popup.js)
- [player.html](player.html)
- [player.css](player.css)
- [player.js](player.js)
