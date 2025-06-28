import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({ credential: applicationDefault() });

async function createAdmin() {
  try {
    const user = await getAuth().createUser({
      email: "admin@admin.com",
      password: "admin1234",
      displayName: "Admin",
    });
    await getAuth().setCustomUserClaims(user.uid, { admin: true });
    console.log("Admin user created:", user.email);
  } catch (e: any) {
    if (e.code === 'auth/email-already-exists') {
      console.log("Admin user already exists.");
    } else {
      console.error(e);
    }
  }
}

createAdmin(); 