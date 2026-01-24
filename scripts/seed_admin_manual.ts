
import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Function to read .env.local manually
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('.env.local not found!');
        process.exit(1);
    }

    const content = fs.readFileSync(envPath, 'utf-8');
    console.log('File length:', content.length);
    console.log('First 100 chars:', JSON.stringify(content.substring(0, 100)));

    const env: Record<string, string> = {};

    content.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;

        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            env[key] = value;
        }
    });
    console.log('Loaded keys:', Object.keys(env));
    return env;
}

const env = loadEnv();

const serviceAccount = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    // Replace \\n with \n in private key
    privateKey: env.FIREBASE_PRIVATE_KEY ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
};

if (!serviceAccount.privateKey || !serviceAccount.clientEmail) {
    console.error('Missing Firebase credentials in .env.local');
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

async function createAdmin() {
    console.log('Creating admin user...');
    const email = "admin@admin.com";
    const password = "admin1234";
    const displayName = "Admin";

    try {
        let user;
        try {
            user = await getAuth().getUserByEmail(email);
            console.log('User already exists:', user.uid);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                user = await getAuth().createUser({
                    email,
                    password,
                    displayName,
                });
                console.log('User created:', user.uid);
            } else {
                throw e;
            }
        }

        // Set custom claims
        await getAuth().setCustomUserClaims(user!.uid, { role: 'admin' });
        console.log('Set admin claim for user');

        // Create user document in Firestore
        await getFirestore().collection('users').doc(user!.uid).set({
            uid: user!.uid,
            email: email,
            name: displayName,
            role: 'admin',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        }, { merge: true });
        console.log('Created/Updated user document in Firestore');

        console.log('Success! check login with:', email, password);

    } catch (e) {
        console.error('Error creating admin:', e);
    }
}

createAdmin();
