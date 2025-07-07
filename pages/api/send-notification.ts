import { NextApiRequest, NextApiResponse } from 'next';
import admin from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { tenantId, roomId, message } = req.body;

  if (!tenantId || !roomId || !message) {
    return res.status(400).json({ message: 'Missing required fields: tenantId, roomId, message' });
  }

  try {
    await admin.firestore().collection('notifications').add({
      tenantId,
      roomId,
      message,
      timestamp: FieldValue.serverTimestamp(),
      isRead: false,
    });

    res.status(200).json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
}
