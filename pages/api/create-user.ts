import { NextApiRequest, NextApiResponse } from 'next';
import admin from '../../lib/firebase-admin';
import transporter from '../../lib/nodemailer';
import { withAuth } from '../../lib/auth-middleware';
import { generateTemporaryPassword } from '../../lib/utils';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, role = 'user', status = 'active', roomId } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Missing name or email' });
  }

  try {
    let userRecord;
    let message = 'User created successfully and password setup email sent.';
    let isNewUser = false;

    try {
      userRecord = await admin.auth().getUserByEmail(email);
      message = 'User already exists.';
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        isNewUser = true;
        const tempPassword = generateTemporaryPassword();
        userRecord = await admin.auth().createUser({
          email,
          password: tempPassword,
          displayName: name,
          emailVerified: false,
        });

        const userData = {
          name,
          email,
          role,
          status,
          avatar: '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          uid: userRecord.uid,
        };
        await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

        const resetLink = await admin.auth().generatePasswordResetLink(email);
        await transporter.sendMail({
          from: `"TeeRao" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Set Your New Account Password for TeeRao',
          html: `
            <p>Hello ${name},</p>
            <p>An account has been created for you on TeeRao. Please click the link below to set your password:</p>
            <a href="${resetLink}">Set Password</a>
            <p>If you did not request this, please ignore this email.</p>
          `,
        });
      } else {
        throw error;
      }
    }

    res.status(200).json({
      success: true,
      message,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
      },
      isNewUser,
    });

  } catch (error: any) {
    console.error('Error in create-user API:', error);
    res.status(500).json({ error: error.message || 'An unknown error occurred.' });
  }
};

export default withAuth(['admin', 'owner'], handler); 