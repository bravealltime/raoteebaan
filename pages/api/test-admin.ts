
import type { NextApiRequest, NextApiResponse } from 'next';
import admin from '../../lib/firebase-admin';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        // 1. Check Env Vars presence (masked)
        const envCheck = {
            projectId: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing',
            privateKey: process.env.FIREBASE_PRIVATE_KEY ?
                `Set (Length: ${process.env.FIREBASE_PRIVATE_KEY.length})` : 'Missing'
        };

        // 2. Initialized Apps
        const apps = admin.apps.map(app => app?.name);

        // 3. Try to fetch 1 user (Testing Auth)
        let authCheck = 'Pending';
        try {
            await admin.auth().listUsers(1);
            authCheck = 'Success';
        } catch (e: any) {
            authCheck = `Failed: ${e.message}`;
        }

        // 4. Try to fetch Firestore
        let firestoreCheck = 'Pending';
        try {
            await admin.firestore().collection('users').limit(1).get();
            firestoreCheck = 'Success';
        } catch (e: any) {
            firestoreCheck = `Failed: ${e.message}`;
        }

        res.status(200).json({
            status: 'Check Complete',
            envCheck,
            apps,
            authCheck,
            firestoreCheck
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'Critical Error',
            message: error.message,
            stack: error.stack
        });
    }
}
