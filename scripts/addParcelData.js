// Script to add sample parcel data to Firestore
// Run this with: node scripts/addParcelData.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  // Add your Firebase config here
  // This should match your project's configuration
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleParcels = [
  {
    roomId: "101",
    roomNumber: "101",
    tenantName: "สมชาย ใจดี",
    recipient: "สมชาย ใจดี",
    sender: "Shopee",
    description: "เสื้อผ้า 2 ชิ้น",
    status: "received",
    receivedDate: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)), // 1 day ago
    trackingNumber: "TH123456789",
    notes: "ขนาดกล่องกลาง สีน้ำเงิน"
  },
  {
    roomId: "102",
    roomNumber: "102", 
    tenantName: "สมหญิง ใจงาม",
    recipient: "สมหญิง ใจงาม",
    sender: "Lazada",
    description: "อุปกรณ์ครัว",
    status: "pending",
    receivedDate: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // 2 days ago
    trackingNumber: "LZ987654321",
    notes: ""
  },
  {
    roomId: "103",
    roomNumber: "103",
    tenantName: "สมปอง รักดี", 
    recipient: "สมปอง รักดี",
    sender: "Flash Express",
    description: "หนังสือ 3 เล่ม",
    status: "received",
    receivedDate: Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)), // 4 days ago (overdue)
    trackingNumber: "FE445566778",
    notes: "ห่อด้วยกระดาษน้ำตาล"
  },
  {
    roomId: "101",
    roomNumber: "101",
    tenantName: "สมชาย ใจดี",
    recipient: "สมชาย ใจดี", 
    sender: "Kerry Express",
    description: "ยาสามัญประจำบ้าน",
    status: "delivered",
    receivedDate: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)), // 5 days ago
    deliveredDate: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), // 3 days ago
    trackingNumber: "KE112233445",
    notes: "ห้ามแช่แข็ง"
  },
  {
    roomId: "104",
    roomNumber: "104",
    tenantName: "สมศรี ใจเย็น",
    recipient: "สมศรี ใจเย็น",
    sender: "J&T Express", 
    description: "เครื่องสำอาง",
    status: "pending",
    receivedDate: Timestamp.fromDate(new Date(Date.now() - 1 * 60 * 60 * 1000)), // 1 hour ago
    trackingNumber: "JT556677889",
    notes: "ของเปราะ ระวังการขนส่ง"
  }
];

async function addSampleData() {
  try {
    console.log('Adding sample parcel data...');
    
    for (const parcel of sampleParcels) {
      const docRef = await addDoc(collection(db, "parcels"), {
        ...parcel,
        createdBy: "admin", // Mock admin user
        createdAt: Timestamp.now()
      });
      console.log(`Added parcel with ID: ${docRef.id}`);
    }
    
    console.log('Sample data added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample data:', error);
    process.exit(1);
  }
}

addSampleData();
