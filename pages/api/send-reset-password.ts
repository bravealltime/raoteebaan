import { NextApiRequest, NextApiResponse } from 'next';
import admin from '../../lib/firebase-admin';
import transporter from '../../lib/nodemailer';
import { withAuth } from '../../lib/auth-middleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const actionCodeSettings = {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        handleCodeInApp: true,
    };

    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    await transporter.sendMail({
      from: `"TeeRao" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your TeeRao Account Password',
      html: `
        <p>Hello ${user.displayName || ''},</p>
        <p>We received a request to reset your password. Please click the link below to set a new password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    res.status(200).json({ success: true, message: 'Password reset email sent.' });

  } catch (error: any) {
    console.error('Error in send-reset-password API:', error);
    res.status(500).json({ error: error.message || 'An unknown error occurred.' });
  }
};

export default withAuth(['admin'], handler);
