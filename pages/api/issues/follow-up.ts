import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { issueId, tenantName } = req.body;

  if (!issueId || !tenantName) {
    return res.status(400).json({ message: 'Missing issueId or tenantName' });
  }

  try {
    const issueRef = db.collection('issues').doc(issueId);
    const issueDoc = await issueRef.get();

    if (!issueDoc.exists) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const issueData = issueDoc.data();

    // Optional: Check if already followed up recently to prevent spam from backend
    if (issueData?.lastFollowUpAt) {
      const lastFollowUpTime = issueData.lastFollowUpAt.toMillis();
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (lastFollowUpTime > twentyFourHoursAgo) {
        return res.status(429).json({ message: 'You can only follow up on an issue once every 24 hours.' });
      }
    }

    // Update the issue with the last follow-up time
    await issueRef.update({
      lastFollowUpAt: Timestamp.now(),
    });

    // Create a notification for the technician or admin
    const notification = {
      userId: issueData?.technicianId || 'admin', // Fallback to admin if no technician assigned
      title: `ติดตามเรื่องแจ้งซ่อม: ห้อง ${issueData?.roomId}`,
      message: `${tenantName} จากห้อง ${issueData?.roomId} ได้ติดตามเรื่องแจ้งซ่อม: "${issueData?.description}" ที่ค้างมานานกว่า 3 วัน`,
      createdAt: Timestamp.now(),
      isRead: false,
      type: 'issue_follow_up',
      relatedId: issueId,
    };

    await db.collection('notifications').add(notification);

    res.status(200).json({ message: 'Follow-up successful' });

  } catch (error) {
    console.error('Error following up on issue:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}