import { NextApiRequest, NextApiResponse } from 'next';
import admin from '../../lib/firebase-admin';
import transporter from '../../lib/nodemailer';

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
      subject: 'Your Password Reset Request',
      html: `
        <p>We received a request to reset your password.</p>
        <p>Please click the link below to set a new password:</p>
        <a href="${resetLink}">Set New Password</a>
        <p>If you did not request this password reset, please ignore this email.</p>
      `,
    });

    res.status(200).json({ success: true, message: 'Password reset email sent successfully.' });

  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'No user found for this email.' });
    }
    const errorMessage = error.message || 'An error occurred while sending the password reset email.';
    res.status(500).json({ error: errorMessage });
  }
}