import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

export function useRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRooms() {
      const querySnapshot = await getDocs(collection(db, "rooms"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(data);
      setLoading(false);
    }
    fetchRooms();
  }, []);

  return { rooms, loading };
} 