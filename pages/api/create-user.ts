import { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n'),
    }),
  });
}

// Nodemailer transporter setup
// IMPORTANT: Add these to your .env.local file
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // e.g., 'smtp.gmail.com'
  port: Number(process.env.SMTP_PORT), // e.g., 587
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,     // your email address
    pass: process.env.SMTP_PASS,     // your email password or app password
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Firebase ID token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const requestingUserUid = decodedToken.uid;

    // Fetch the role of the user making the request from Firestore
    const requestingUserDoc = await admin.firestore().collection('users').doc(requestingUserUid).get();
    const requestingUserRole = requestingUserDoc.data()?.role;

    // Only allow 'admin' to create new users
    if (requestingUserRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Only admin users can create new accounts' });
    }

    const { name, email, status } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Missing name or email' });
    }

    // Check if user already exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create user with temporary password
        userRecord = await admin.auth().createUser({
          email,
          password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12), // Random password
          displayName: name,
          emailVerified: false,
        });

        // Save user data to Firestore
        await admin.firestore().collection('users').doc(userRecord.uid).set({
          name,
          email,
          role: 'user', // Explicitly set role to 'user'
          status: status || 'active',
          avatar: '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          uid: userRecord.uid,
        });

        // Generate password reset link
        const resetLink = await admin.auth().generatePasswordResetLink(email);

        // Send password reset email
        await transporter.sendMail({
          from: `"Your App Name" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'ตั้งรหัสผ่านสำหรับบัญชีใหม่ของคุณ',
          html: `
            <p>สวัสดีคุณ ${name},</p>
            <p>บัญชีของคุณถูกสร้างขึ้นเรียบร้อยแล้ว กรุณาคลิกที่ลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
            <a href="${resetLink}">ตั้งรหัสผ่าน</a>
            <p>หากคุณไม่ได้ร้องขอการสร้างบัญชีนี้ กรุณาไม่ต้องดำเนินการใดๆ</p>
          `,
        });
      } else {
        throw error;
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'User created and password reset email sent.',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
      }
    });

  } catch (error: any) {
    console.error('Error creating user:', error); // Log the full error on the server

    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'อีเมลนี้มีผู้ใช้งานในระบบแล้ว' });
    }
    
    // Return a more specific error message to the client
    const errorMessage = error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุในการสร้างผู้ใช้';
    res.status(500).json({ error: errorMessage });
  }
} 