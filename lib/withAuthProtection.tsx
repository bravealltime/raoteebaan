
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import { User } from '../types/chat';

type Role = 'admin' | 'owner' | 'employee' | 'user';

const withAuthProtection = (WrappedComponent: React.ComponentType<any>, allowedRoles: Role[]) => {
  const AuthComponent = (props: any) => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUser(userData);

            if (!allowedRoles.includes(userData.role as Role)) {
              // Redirect based on role if not allowed
              switch (userData.role) {
                case 'admin':
                case 'owner':
                  router.replace('/');
                  break;
                case 'user':
                  router.replace('/tenant-dashboard');
                  break;
                default:
                  router.replace('/login');
                  break;
              }
            } else {
              setLoading(false);
            }
          } else {
            // User document doesn't exist, redirect to login
            router.replace('/login');
          }
        } else {
          // No user logged in, redirect to login
          router.replace('/login');
        }
      });

      return () => unsubscribe();
    }, [router]);

    if (loading) {
      return <LoadingSpinner />;
    }

    if (!user) {
        return null; // Or some other placeholder
    }

    return <WrappedComponent {...props} currentUser={user} />;
  };

  return AuthComponent;
};

export default withAuthProtection;
