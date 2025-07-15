
import { NextApiRequest, NextApiResponse } from 'next';
import admin from '../../lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Verify Admin Privileges
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const requesterUid = decodedToken.uid;
    const requesterDoc = await admin.firestore().collection('users').doc(requesterUid).get();

    if (requesterDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: User is not an admin' });
    }

    // 2. Get user data from request body
    const { id, name, email, role, status } = req.body;
    if (!id || !name || !email || !role || !status) {
      return res.status(400).json({ error: 'Bad Request: Missing required fields' });
    }

    const auth = admin.auth();
    const db = admin.firestore();

    // 3. Get current user from Auth to check if email needs updating
    const userRecord = await auth.getUser(id);
    const currentEmail = userRecord.email;

    const authUpdates: { email?: string; displayName?: string } = { displayName: name };
    if (email !== currentEmail) {
      authUpdates.email = email;
    }

    // 4. Update Firebase Auth if needed
    if (Object.keys(authUpdates).length > 1 || authUpdates.displayName !== userRecord.displayName) {
        await auth.updateUser(id, authUpdates);
    }

    // 5. Update Firestore
    const userRef = db.collection('users').doc(id);
    await userRef.update({
      name,
      email,
      role,
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    const errorMessage = error.code ? `Firebase error (${error.code})` : 'Internal Server Error';
    res.status(500).json({ error: errorMessage, details: error.message });
  }
}
