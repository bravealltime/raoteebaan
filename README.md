# TeeRao - ระบบจัดการค่าไฟฟ้าและห้องพัก

ระบบจัดการค่าไฟฟ้าและห้องพักที่ทันสมัย พัฒนาด้วย Next.js, TypeScript, Chakra UI และ Firebase

## 🚀 ฟีเจอร์หลัก

- **Dashboard** - จัดการห้องพักทั้งหมด พร้อมสถานะและข้อมูลครบถ้วน
- **Authentication** - ระบบเข้าสู่ระบบด้วย Firebase Auth
- **Bill Management** - สร้างและจัดการใบแจ้งค่าใช้จ่าย
- **History Tracking** - บันทึกประวัติการอ่านมิเตอร์และคำนวณค่าใช้จ่าย
- **PromptPay Integration** - สร้าง QR Code สำหรับชำระเงินผ่าน PromptPay
- **PDF Export** - ส่งออกใบแจ้งค่าใช้จ่ายเป็น PDF
- **CSV Import/Export** - นำเข้าและส่งออกข้อมูลห้องพักผ่าน CSV
- **Responsive Design** - รองรับการใช้งานบนทุกอุปกรณ์
- **Custom Font** - ใช้ฟอนต์ Kanit เป็นฟอนต์หลักทั้งเว็บ

## 🛠️ เทคโนโลยีที่ใช้

- **Frontend**: Next.js 15.3.4, TypeScript, Chakra UI
- **Backend**: Firebase (Auth, Firestore)
- **Font**: Kanit-Regular (Thai font)
- **QR Code**: qrcode-generator, custom PromptPay script
- **PDF**: html2pdf.js
- **CSV**: papaparse

## 📦 การติดตั้ง

1. **Clone โปรเจกต์**
   ```bash
   git clone <repository-url>
   cd raoteebaan
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   npm install
   ```

3. **ตั้งค่า Environment Variables**
   สร้างไฟล์ `.env.local` และเพิ่ม Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   # ... เพิ่ม Firebase config อื่นๆ
   ```

4. **รัน Development Server**
   ```bash
   npm run dev
   ```

5. **เปิดเบราว์เซอร์**
   ไปที่ `http://localhost:3000`

## 🎨 การตั้งค่าฟอนต์

โปรเจกต์นี้ใช้ฟอนต์ **Kanit-Regular** เป็นฟอนต์หลักทั้งเว็บ:

### การตั้งค่าที่ทำไว้แล้ว:
- ✅ ไฟล์ฟอนต์ `Kanit-Regular.ttf` อยู่ใน `public/`
- ✅ CSS configuration ใน `styles/fonts.css` และ `styles/globals.css`
- ✅ Chakra UI theme ตั้งค่าให้ใช้ Kanit เป็นฟอนต์หลัก
- ✅ Next.js configuration สำหรับ font optimization

### การเปลี่ยนฟอนต์:
หากต้องการเปลี่ยนฟอนต์:
1. แทนที่ไฟล์ฟอนต์ใน `public/`
2. อัปเดต `styles/fonts.css` และ `styles/globals.css`
3. แก้ไข theme ใน `pages/_app.tsx`

### PDF Font Support:
สำหรับการส่งออก PDF ที่มีฟอนต์ไทย:
- ✅ ใช้ Google Fonts (Sarabun, Noto Sans Thai) เป็น fallback
- ✅ ฝังฟอนต์ Kanit ใน PDF generation
- ✅ รองรับการแสดงผลภาษาไทยใน PDF
- ✅ มี loading state ระหว่างการสร้าง PDF

**หมายเหตุ**: PDF จะใช้ฟอนต์ Kanit เป็นหลัก และมี Google Fonts เป็น fallback เพื่อให้แน่ใจว่าข้อความไทยจะแสดงผลได้ถูกต้อง

## 🏗️ โครงสร้างโปรเจกต์

```
raoteebaan/
├── components/          # React Components
│   ├── AppHeader.tsx   # Header component
│   ├── RoomCard.tsx    # Room card component
│   ├── AddRoomModal.tsx # Add room modal
│   ├── InvoiceModal.tsx # Invoice modal
│   ├── ErrorBoundary.tsx # Error boundary
│   └── LoadingSpinner.tsx # Loading component
├── pages/              # Next.js pages
│   ├── _app.tsx        # App wrapper
│   ├── login.tsx       # Login page
│   ├── dashboard.tsx   # Dashboard page
│   ├── bill/[roomId].tsx # Bill detail page
│   └── history/[roomId].tsx # History page
├── lib/                # Utilities
│   └── firebase.ts     # Firebase configuration
├── styles/             # CSS files
│   ├── fonts.css       # Font loading configuration
│   └── globals.css     # Global styles
├── public/             # Static files
│   ├── Kanit-Regular.ttf # Custom Thai font
│   └── scripts/        # Custom scripts
│       └── promptpay.js # PromptPay QR generator
├── scripts/            # Build scripts
└── next.config.js      # Next.js configuration
```

## 🔧 การใช้งาน

### การเข้าสู่ระบบ
- ใช้ Firebase Authentication
- รองรับ Email/Password login

### การจัดการห้องพัก
- ดูรายการห้องพักทั้งหมดใน Dashboard
- เพิ่มห้องใหม่ผ่าน Add Room Modal
- ลบห้องที่ไม่ต้องการ
- ดูรายละเอียดบิลและประวัติ

### การจัดการบิล
- สร้างใบแจ้งค่าใช้จ่ายอัตโนมัติ
- สร้าง QR Code PromptPay
- ส่งออกเป็น PDF
- บันทึกประวัติการคำนวณ

### การนำเข้าข้อมูล
- ส่งออกข้อมูลห้องพักเป็น CSV
- นำเข้าข้อมูลห้องพักจาก CSV
- รองรับการ preview ข้อมูลก่อนนำเข้า

## 🚀 การ Deploy

### Vercel (แนะนำ)
1. Push โค้ดไปยัง GitHub
2. เชื่อมต่อกับ Vercel
3. ตั้งค่า Environment Variables
4. Deploy อัตโนมัติ

### Firebase Hosting
```bash
npm run build
firebase deploy
```

## 🔒 ความปลอดภัย

- ใช้ Environment Variables สำหรับ Firebase config
- มี Error Boundary สำหรับจัดการ errors
- Input validation ในฟอร์มต่างๆ
- Firebase Security Rules สำหรับ Firestore

## 📱 Responsive Design

- รองรับ Desktop, Tablet, Mobile
- ใช้ Chakra UI breakpoints
- Optimized สำหรับทุกขนาดหน้าจอ

## 🐛 การแก้ไขปัญหา

### Build Errors
- ตรวจสอบ TypeScript types
- ตรวจสอบ Environment Variables
- รัน `npm run build` เพื่อดู errors

### Firebase Issues
- ตรวจสอบ Firebase configuration
- ตรวจสอบ Firestore rules
- ตรวจสอบ Authentication setup

### QR Code Issues
- ตรวจสอบการโหลด scripts
- ตรวจสอบ PromptPay number format
- ตรวจสอบ browser console

## 🤝 การมีส่วนร่วม

1. Fork โปรเจกต์
2. สร้าง Feature branch
3. Commit changes
4. Push to branch
5. สร้าง Pull Request

## 📄 License

MIT License - ดูรายละเอียดใน LICENSE file

## 📞 ติดต่อ

สำหรับคำถามหรือปัญหาต่างๆ กรุณาสร้าง Issue ใน GitHub repository 