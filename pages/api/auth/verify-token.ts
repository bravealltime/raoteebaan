
import type { NextApiRequest, NextApiResponse } from 'next';
import admin from '../../../lib/firebase-admin';

type Data = {
  role?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
    }
    const userRole = userDoc.data()?.role;

    if (!userRole) {
        return res.status(500).json({ error: 'User role not found in database' });
    }

    res.status(200).json({ role: userRole });
  } catch (error) {
    console.error('API Token verification failed:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}
