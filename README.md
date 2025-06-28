# Electricity Bill Room Management App

แอป Next.js สำหรับเก็บค่าใช้จ่ายในห้องพัก พร้อมระบบล็อกอินและ Dashboard

## Tech Stack
- Next.js (TypeScript)
- Chakra UI
- Firebase (Auth + Firestore)

## โครงสร้างโปรเจกต์

- `/pages/_app.tsx` — Setup ChakraProvider
- `/pages/login.tsx` — หน้า Login
- `/pages/dashboard.tsx` — Dashboard หลัก
- `/lib/firebase.ts` — ตั้งค่า Firebase
- `/components/RoomCard.tsx` — Card แสดงข้อมูลห้อง
- `/components/AddRoomModal.tsx` — Modal เพิ่มห้องใหม่

## วิธีเริ่มต้น

1. ติดตั้ง dependencies
   ```bash
   npm install
   ```
2. ตั้งค่า Firebase ใน `/lib/firebase.ts`
3. รันโปรเจกต์
   ```bash
   npm run dev
   ```

---

> สามารถต่อยอดเชื่อม Firestore, เพิ่มฟีเจอร์, และปรับ UI ได้ตามต้องการ 