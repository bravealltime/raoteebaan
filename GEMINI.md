This project, "TeeRao," is a comprehensive property management system built with Next.js, TypeScript, Chakra UI, and Firebase. It's designed for managing room rentals, billing, and user interactions in a dormitory or apartment setting.

### Key Technologies & Features:

- **Core Stack:** Next.js, React, TypeScript.
- **UI:** Chakra UI is used for the component library, styling, and responsive design. The application features a custom Thai font ("Kanit").
- **Backend & Database (Firebase):**
    - **Firestore:** The primary database for storing all application data, including rooms, users, bills, meter readings, and chat messages.
    - **Firebase Authentication:** Handles user login with email/password and manages role-based access control (admin, owner, tenant, etc.).
    - **Firebase Storage:** Used for storing user-uploaded files like profile avatars and payment slips.
    - **Firebase Admin SDK:** Utilized in server-side API routes for administrative tasks like creating new users.
- **Main Functionalities:**
    - **Role-Based Access Control:** The application has distinct views and permissions for different user roles:
        - **Admin/Owner:** Full access to manage rooms, users, and billing.
        - **Tenant (`user`):** Can view their room details, bills, and communicate with admins.
        - **Employee:** A dedicated (currently placeholder) dashboard.
    - **Room Management:** A dashboard for admins to view, add, edit, delete, search, and filter rooms.
    - **Billing & Invoicing:**
        - Calculates monthly bills based on rent, services, and metered utilities (water, electricity).
        - Supports adding extra, one-time charges to an invoice.
        - Generates PDF invoices for tenants.
        - Integrates a PromptPay QR code generator for payments.
        - Allows tenants to upload payment slips, which admins can then review and approve.
    - **User Management:** An admin panel to create new users, assign roles, and send password-reset links. Users can also manage their own profiles.
    - **Communication:** A built-in messaging system for users to communicate with each other.
- **Code Structure:**
    - `pages/`: Defines the application's routes and contains the primary logic for each page.
    - `components/`: Holds reusable React components, including modals, cards, and the main layout structure (`MainLayout`, `Sidebar`, `AppHeader`).
    - `lib/`: Contains utility functions, primarily the Firebase client configuration (`firebase.ts`).
    - `styles/`: Global CSS and font definitions.
    - `public/`: Static assets, including the font file and the PromptPay script.
