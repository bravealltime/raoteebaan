var admin = require("firebase-admin");

var serviceAccount = require("/Users/tharanuthiransrettawat/Downloads/raoteebaan-firebase-adminsdk-fbsvc-58c7c6d4ab.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://raoteebaan-default-rtdb.asia-southeast1.firebasedatabase.app"
});

admin.auth().createUser({
  email: "admin@admin.com",
  password: "admin1234",
  displayName: "Admin"
}).then(userRecord => {
  return admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
}).then(() => {
  
  process.exit(0);
}).catch(error => {
  if (error.code === 'auth/email-already-exists') {
    
    process.exit(0);
  } else {
    console.error(error);
    process.exit(1);
  }
}); 