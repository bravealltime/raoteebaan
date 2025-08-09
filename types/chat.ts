
import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
  photoURL?: string;
  roomNumber?: string;
  isOnline?: boolean;
  lastSeen?: Timestamp;
}

export interface Conversation {
  id: string;
  participants?: User[];
  lastMessage?: { text: string; senderId:string; isRead?: boolean; receiverId?: string; };
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  timestamp: Timestamp;
  isRead?: boolean;
  receiverId?: string;
  replyTo?: {
    id:string;
    text?: string;
    senderId: string;
    imageUrl?: string;
  }
}
