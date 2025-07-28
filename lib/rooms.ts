import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

interface Room {
  id: string;
  status: "occupied" | "vacant";
  tenantName: string;
  tenantId?: string;
  tenantEmail?: string;
  ownerId?: string;
  area: number;
  rent: number;
  service: number;
  electricity: number;
  water: number;
  latestTotal: number;
  billStatus: "paid" | "unpaid" | "pending";
  overdueDays: number;
  startDate?: string;
  endDate?: string;
  emergencyContact?: string;
  contractLength?: number;
  extraServices?: Array<{
    label: string;
    value: number;
  }>;
}

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const querySnapshot = await getDocs(collection(db, "rooms"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
        setRooms(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, []);

  return { rooms, loading, error };
}

export async function resetRoom(roomId: string) {
  const roomRef = doc(db, "rooms", roomId);
  await updateDoc(roomRef, {
    status: "vacant",
    tenantName: "",
    tenantId: null,
    tenantEmail: null,
    billStatus: "unpaid",
    overdueDays: 0,
    electricity: 0,
    water: 0,
    latestTotal: 0,
    extraServices: [],
    startDate: null,
    endDate: null,
    emergencyContact: null,
    contractLength: null,
  });
} 