import { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Generate password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // Send password reset email
    await transporter.sendMail({
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'คำขอรีเซ็ตรหัสผ่านของคุณ',
      html: `
        <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ</p>
        <p>กรุณาคลิกที่ลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
        <a href="${resetLink}">ตั้งรหัสผ่านใหม่</a>
        <p>หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่านนี้ กรุณาไม่ต้องดำเนินการใดๆ</p>
      `,
    });

    res.status(200).json({ success: true, message: 'Password reset email sent successfully.' });

  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้งานสำหรับอีเมลนี้' });
    }
    const errorMessage = error.message || 'เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน';
    res.status(500).json({ error: errorMessage });
  }
}