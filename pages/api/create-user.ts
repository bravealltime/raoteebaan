import { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, role, status } = req.body;

    // Validate required fields
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create user with temporary password
    const userRecord = await admin.auth().createUser({
      email,
      password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12), // Random password
      displayName: name,
      emailVerified: false,
    });

    // Save user data to Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      name,
      email,
      role,
      status: status || 'active',
      avatar: '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      uid: userRecord.uid,
    });

    // Generate password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
    });

    // Send email with reset link (you can use any email service here)
    // For now, we'll just return the link in the response
    // In production, you should use a proper email service like SendGrid, Mailgun, etc.

    res.status(200).json({ 
      success: true, 
      message: 'User created successfully',
      resetLink,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
      }
    });

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'อีเมลนี้มีผู้ใช้งานแล้ว' });
    }
    
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' });
  }
} 