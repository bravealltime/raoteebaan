# การตั้งค่า Firebase Admin SDK สำหรับระบบสร้างผู้ใช้

## ขั้นตอนการตั้งค่า

### 1. สร้าง Service Account Key
1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. เลือกโปรเจคของคุณ
3. ไปที่ **Project Settings** (ไอคอนเฟือง)
4. เลือกแท็บ **Service Accounts**
5. คลิก **Generate New Private Key**
6. ดาวน์โหลดไฟล์ JSON

### 2. สร้างไฟล์ .env.local
สร้างไฟล์ `.env.local` ในโฟลเดอร์หลักของโปรเจค และใส่ข้อมูลต่อไปนี้:

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"

# App URL for password reset links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. ข้อมูลที่ต้องใส่
จากไฟล์ JSON ที่ดาวน์โหลดมา ให้คัดลอกข้อมูลต่อไปนี้:

- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`  
- `private_key` → `FIREBASE_PRIVATE_KEY` (ใส่ในเครื่องหมายคำพูด)

### 4. ตัวอย่างไฟล์ .env.local
```env
FIREBASE_PROJECT_ID=my-dormitory-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@my-dormitory-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## การใช้งาน

หลังจากตั้งค่าเสร็จแล้ว ระบบจะสามารถ:

1. **สร้างผู้ใช้ใหม่** - Admin สามารถสร้างผู้ใช้ใหม่ได้จากหน้า Admin Panel
2. **ส่งลิงก์ตั้งรหัสผ่าน** - ระบบจะสร้างลิงก์สำหรับตั้งรหัสผ่านและแสดงให้ admin
3. **ผู้ใช้ตั้งรหัสผ่าน** - ผู้ใช้คลิกลิงก์เพื่อตั้งรหัสผ่านใหม่

## หมายเหตุ

- ไฟล์ `.env.local` จะไม่ถูก commit ขึ้น Git (อยู่ใน .gitignore)
- ลิงก์ตั้งรหัสผ่านจะหมดอายุใน 1 ชั่วโมง
- ระบบจะสร้างรหัสผ่านชั่วคราวให้ผู้ใช้ใหม่ 