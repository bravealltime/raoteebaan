import { auth, db, rtdb } from "./firebase";
import { ref, onValue, set, onDisconnect } from "firebase/database";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { User } from "../types/chat";

export const setupPresence = (user: User) => {
  if (!user || !user.uid) return;

  const userStatusDatabaseRef = ref(rtdb, '/status/' + user.uid);
  const userFirestoreRef = doc(db, '/users/' + user.uid);

  // Create a reference to the special '.info/connected' path in Realtime Database
  onValue(ref(rtdb, '.info/connected'), async (snapshot) => {
    if (snapshot.val() === false) {
      // If we are disconnected, don't set a status, just return
      // This is to avoid a race condition where we set a status and then immediately disconnect
      return;
    }

    // Set our initial online status in Realtime Database
    await set(userStatusDatabaseRef, {
      state: 'online',
      lastSeen: serverTimestamp(),
    });

    // Set our online status in Firestore
    await updateDoc(userFirestoreRef, {
      isOnline: true,
      lastSeen: serverTimestamp(),
    });

    // When I disconnect, update the Realtime Database
    onDisconnect(userStatusDatabaseRef).set({
      state: 'offline',
      lastSeen: serverTimestamp(),
    });
  });
};

export const setOffline = async (uid: string) => {
  if (!uid) return;
  const userStatusDatabaseRef = ref(rtdb, '/status/' + uid);
  const userFirestoreRef = doc(db, '/users/' + uid);

  await set(userStatusDatabaseRef, {
    isOnline: false,
    lastSeen: serverTimestamp(),
  });
  await updateDoc(userFirestoreRef, {
    isOnline: false,
    lastSeen: serverTimestamp(),
  });
};