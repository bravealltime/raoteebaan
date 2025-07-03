# TeeRao Property Management System

This project, **"TeeRao,"** is a comprehensive property management system built with Next.js, TypeScript, Chakra UI, and Firebase. It's designed for managing room rentals, billing, user management, and communications in a dormitory or apartment setting.

## Technology Stack

### Core Technologies
- **Frontend:** Next.js 15.3.4, React 18.3.1, TypeScript 5.8.3
- **UI Framework:** Chakra UI 2.8.1 with Emotion for styling
- **Animations:** Framer Motion 10.16.4
- **Backend:** Firebase (Firestore, Authentication, Storage, Realtime Database)
- **State Management:** React hooks and Firebase real-time listeners
- **PDF Generation:** jsPDF 3.0.1
- **Data Processing:** PapaParse 5.5.3 for CSV handling
- **Typography:** Custom Thai font "Kanit" for optimal Thai language support

### Firebase Services Used
- **Firestore:** Primary NoSQL database for all application data
- **Firebase Authentication:** Email/password authentication with role-based access
- **Firebase Storage:** File storage for avatars, payment slips, and documents
- **Firebase Admin SDK:** Server-side operations for user management
- **Realtime Database:** Real-time status tracking for messaging system

## Core Features & Functionality

### 1. Role-Based Access Control
The system supports multiple user roles with distinct permissions and views:

- **Admin:** Full system access, can manage all rooms, users, and billing
- **Owner:** Can manage their own properties and tenants
- **Employee:** Limited access (dashboard implementation)  
- **Tenant (User):** Can view their room details, bills, and communicate with property managers

### 2. Room Management System
- **Room Creation & Editing:** Add/modify room details including tenant information, area, rent, and service charges
- **Occupancy Tracking:** Track room status (occupied/vacant) and tenant assignments
- **Search & Filtering:** Filter rooms by payment status (unpaid/vacant) and search by room ID or tenant name
- **Bulk Operations:** CSV import/export for room data management
- **Equipment Assessment:** Generate PDF equipment condition reports

### 3. Advanced Billing & Invoice System
- **Utility Meter Reading:** Track electricity and water consumption with configurable rates
- **Bill Calculation:** Automatic calculation of total bills including:
  - Fixed rent charges
  - Service fees
  - Electricity usage (units × rate)
  - Water usage (units × rate)  
  - Additional one-time services
- **PDF Invoice Generation:** Professional Thai invoices with PromptPay QR codes
- **Payment Tracking:** Three-tier payment status system (unpaid → pending → paid)
- **Overdue Management:** Automatic calculation of overdue days and late fees

### 4. Payment Processing & Verification
- **PromptPay Integration:** QR code generation for easy mobile payments
- **Payment Slip Upload:** Tenants can upload payment proof images
- **Discord Webhook Integration:** Automatic notification system for new payments
- **Admin Verification:** Review and approve/reject payment submissions
- **Payment History:** Complete transaction history with status tracking

### 5. Real-time Communication System
- **Conversation Management:** Create and manage conversations between users
- **Real-time Messaging:** Instant messaging with read status tracking
- **Online Status:** Real-time user presence using Firebase Realtime Database
- **Image Sharing:** Send images through the messaging system
- **Notification System:** Audio notifications for new messages
- **Role-based Filtering:** Owners can only message their tenants

### 6. User Management & Authentication
- **User Creation API:** Server-side user creation with Firebase Admin SDK
- **Password Reset System:** Secure password reset with time-limited links
- **Profile Management:** Users can update avatars and personal information
- **Account Linking:** Automatic tenant account creation and linking to rooms
- **Role Assignment:** Flexible role-based permission system

## Database Schema (Firestore Collections)

### `users` Collection
```typescript
import { Timestamp } from "firebase/firestore";

interface User {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "owner" | "employee" | "user";
  status: "active" | "inactive";
  avatar?: string;
  phoneNumber?: string;
  roomId?: string;      // For tenants
  tenantId?: string;    // User ID reference
  roomNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `rooms` Collection
```typescript
interface Room {
  id: string;
  status: "occupied" | "vacant";
  tenantName: string;
  tenantId?: string;        // Reference to user document
  tenantEmail?: string;
  ownerId?: string;         // Reference to owner user
  area: number;             // Square meters
  rent: number;             // Monthly rent
  service: number;          // Service fees
  electricity: number;      // Latest electricity bill
  water: number;           // Latest water bill
  latestTotal: number;     // Most recent total bill
  billStatus: "paid" | "unpaid" | "pending";
  overdueDays: number;
  extraServices?: Array<{
    label: string;
    value: number;
  }>;
}
```

### `bills` Collection
```typescript
import { Timestamp } from "firebase/firestore";

interface Bill {
  roomId: string;
  tenantId?: string;
  tenantName?: string;
  createdAt: Timestamp;
  date: Timestamp;              // Bill date
  dueDate: Timestamp;           // Payment due date
  status: "unpaid" | "pending" | "paid";
  
  // Electricity details
  electricityMeterCurrent: number;
  electricityMeterPrev: number;
  electricityRate: number;
  electricityUnit: number;
  electricityTotal: number;
  
  // Water details
  waterMeterCurrent: number;
  waterMeterPrev: number;
  waterRate: number;
  waterUnit: number;
  waterTotal: number;
  
  // Other charges
  rent: number;
  service: number;
  extraServices?: Array<{
    label: string;
    value: number;
  }>;
  total: number;
  
  // Payment tracking
  slipUrl?: string;        // Discord webhook URL
  paidAmount?: number;
  paidAt?: Timestamp;
}
```

### `conversations` Collection
```typescript
import { Timestamp } from "firebase/firestore";
import { User } from "./users"; // Assuming User interface is in a separate file

interface Conversation {
  participants: User[];
  lastMessage: string;
  updatedAt: Timestamp;
}
```

### `messages` Subcollection (under conversations)
```typescript
interface Message {
  senderId: string;
  receiverId?: string;
  text?: string;
  imageUrl?: string;
  timestamp: any;
  isRead?: boolean;
}
```

## File Structure & Architecture

### Page Routes (`pages/`)
- **`index.tsx`** - Main rooms dashboard (owner/admin view)
- **`dashboard.tsx`** - Admin-specific dashboard
- **`tenant-dashboard.tsx`** - Tenant-specific dashboard with bill summary
- **`login.tsx`** - Authentication page
- **`admin-users.tsx`** - User management panel
- **`inbox.tsx`** - Real-time messaging system
- **`profile.tsx`** - User profile management
- **`bill/[roomId].tsx`** - Individual bill details and payment
- **`history/[roomId].tsx`** - Billing history and meter readings
- **`reset-password.tsx`** - Password reset functionality
- **`employee.tsx`** - Employee dashboard
- **`parcel.tsx`** - Package management (future feature)

### API Routes (`pages/api/`)
- **`create-user.ts`** - Server-side user creation with Firebase Admin
- **`send-reset-password.ts`** - Password reset email functionality

### Components (`components/`)
- **`MainLayout.tsx`** - Main application layout wrapper
- **`AppHeader.tsx`** - Top navigation header
- **`Sidebar.tsx`** - Role-based navigation sidebar
- **`RoomCard.tsx`** - Individual room display component
- **`AddRoomModal.tsx`** - Room creation modal
- **`EditRoomModal.tsx`** - Room editing modal
- **`MeterReadingModal.tsx`** - Utility meter input modal
- **`InvoiceModal.tsx`** - PDF invoice generation
- **`UploadSlipModal.tsx`** - Payment slip upload interface
- **`NewConversationModal.tsx`** - Start new conversations
- **`ErrorBoundary.tsx`** - Error handling wrapper
- **`LoadingSpinner.tsx`** - Loading state component

### Configuration Files
- **`firebase.ts`** - Firebase client configuration
- **`next.config.js`** - Next.js configuration with font optimization
- **`tsconfig.json`** - TypeScript configuration
- **`.env.local`** - Environment variables (Firebase keys, SMTP settings)

## Environment Variables Required

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Discord Webhook (for payment notifications)
NEXT_PUBLIC_DISCORD_WEBHOOK_URL=

# SMTP Configuration (for password reset emails)
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
```

## Key Business Logic

### Payment Workflow
1. **Bill Generation:** Admin creates bills with meter readings
2. **Tenant Notification:** Tenants see unpaid bills in their dashboard
3. **Payment Submission:** Tenants upload payment slips
4. **Discord Integration:** Payment notifications sent to Discord channel
5. **Admin Verification:** Admins review and approve payments
6. **Status Updates:** Bills marked as paid, rooms updated

### User Access Patterns
- **Admins:** See all rooms and can manage everything
- **Owners:** See only rooms they own (`ownerId` field)
- **Tenants:** See only their assigned room (`tenantId` field)
- **Navigation:** Role-based routing prevents unauthorized access

### Real-time Features
- **Messaging:** Live chat with read receipts and typing indicators
- **Online Status:** Real-time presence tracking
- **Data Sync:** Firebase listeners keep UI updated across sessions

This system provides a complete property management solution with robust billing, communication, and user management capabilities, all built with modern web technologies and real-time synchronization.
