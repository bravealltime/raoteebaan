import { NextApiRequest, NextApiResponse } from 'next';
import admin from './firebase-admin';

// Define a type for user roles for better type safety
type Role = 'admin' | 'owner' | 'employee' | 'user';

/**
 * A middleware function to protect API routes by verifying Firebase ID tokens and checking user roles.
 * @param allowedRoles An array of roles that are allowed to access the route.
 * @param handler The API handler function to execute if authentication and authorization are successful.
 * @returns A new API handler that includes the authentication and authorization logic.
 */
export const withAuth = (allowedRoles: Role[], handler: (req: NextApiRequest, res: NextApiResponse, decodedToken: admin.auth.DecodedIdToken) => void) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const requestingUserUid = decodedToken.uid;

      const requestingUserDoc = await admin.firestore().collection('users').doc(requestingUserUid).get();
      if (!requestingUserDoc.exists) {
        return res.status(403).json({ error: 'Forbidden: User profile not found.' });
      }
      
      const requestingUserRole = requestingUserDoc.data()?.role;

      if (!allowedRoles.includes(requestingUserRole)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to perform this action.' });
      }

      // If authorized, call the actual handler and pass the decoded token
      return handler(req, res, decodedToken);

    } catch (error) {
      console.error('Error verifying auth token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
  };
};