import { NextApiRequest, NextApiResponse } from 'next';
import admin from '../../lib/firebase-admin';
import transporter from '../../lib/nodemailer';
import { withAuth } from '../../lib/auth-middleware';
import { generateTemporaryPassword } from '../../lib/utils';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, role, status, roomId } = req.body;

  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({ error: 'Missing name or email' });
  }

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      // If user exists, return an error
      return res.status(400).json({ error: 'Email already exists.' });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create user with temporary password
        const tempPassword = generateTemporaryPassword();
        userRecord = await admin.auth().createUser({
          email,
          password: tempPassword,
          displayName: name,
          emailVerified: false,
        });

        // Save user data to Firestore
        const userData: { [key: string]: any } = {
          name,
          email,
          role: req.body.role || 'user', // Use role from request body, default to 'user'
          status: status || 'active',
          avatar: '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          uid: userRecord.uid,
        };

        if (role === 'user' && roomId) {
          userData.roomId = roomId;
          // Update the room document with the new tenantId
          await admin.firestore().collection('rooms').doc(roomId).set(
            { tenantId: userRecord.uid, tenantName: name, status: "occupied" },
            { merge: true }
          );
          console.log(`Room ${roomId} updated with tenantId: ${userRecord.uid}`);
        }

        await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

        // Generate password reset link
        const resetLink = await admin.auth().generatePasswordResetLink(email);

        // Send password reset email
        await transporter.sendMail({
          from: `"Your App Name" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Set Your New Account Password',
          html: `
            <p>Hello ${name},</p>
            <p>Your account has been created. Please click the link below to set your new password:</p>
            <a href="${resetLink}">Set Password</a>
            <p>If you did not request this account creation, please ignore this email.</p>
          `,
        });
      } else {
        console.error('Error checking user existence or creating user:', error);
        throw error; // Re-throw other errors
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
    console.error('Error in create-user API:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'This email is already in use.' });
    }
    
    const errorMessage = error.message || 'An unknown error occurred while creating the user.';
    res.status(500).json({ error: errorMessage });
  }
};

export default withAuth(['admin', 'owner'], handler); 