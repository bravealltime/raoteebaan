import { ChakraProvider, extendTheme, Spinner, Center } from "@chakra-ui/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import ErrorBoundary from "../components/ErrorBoundary";
import "../styles/fonts.css";
import "../styles/globals.css";
import { useRouter } from "next/router";
import { useEffect, useState, ReactElement, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { setupPresence, setOffline } from "../lib/presence";
import { NextPage } from "next";
import { User } from "../types/chat";

const theme = extendTheme({
  fonts: {
    heading: "'Kanit', 'Sarabun', 'Prompt', 'Noto Sans Thai', 'Inter', sans-serif",
    body: "'Kanit', 'Sarabun', 'Prompt', 'Noto Sans Thai', 'Inter', sans-serif",
  },
  colors: {
    brand: {
      50: "#e3f2fd",
      100: "#bbdefb",
      200: "#90caf9",
      300: "#64b5f6",
      400: "#42a5f5",
      500: "#2196f3",
      600: "#1e88e5",
      700: "#1976d2",
      800: "#1565c0",
      900: "#0d47a1",
    },
    grayBg: {
      900: "#1a2233",
      800: "#232b38",
      700: "#2d3748"
    }
  },
  styles: {
    global: {
      body: {
        background: "linear-gradient(to bottom right, #e3f2fd, #90caf9)",
        color: "gray.800",
        fontFamily: "'Kanit', 'Sarabun', 'Prompt', 'Noto Sans Thai', 'Inter', sans-serif",
      },
    },
  },
});

type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fullUser: User = {
            uid: user.uid,
            email: user.email || '',
            name: userData.name || user.displayName || '',
            role: userData.role || 'user',
            photoURL: user.photoURL || userData.photoURL || undefined,
            roomNumber: userData.roomNumber || undefined,
          };
          setCurrentUser(fullUser);
          setRole(userData.role);
          setupPresence(fullUser);
        } else {
          // Handle case where user exists in auth but not in firestore
          const defaultUser: User = {
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || '',
            role: 'user', // Default role
            photoURL: user.photoURL || undefined,
          };
          setCurrentUser(defaultUser);
          setRole(null);
          setupPresence(defaultUser);
        }
      } else {
        if (currentUser && currentUser.uid) {
          await setOffline(currentUser.uid);
        }
        setCurrentUser(null);
        setRole(null);
        if (router.pathname !== '/login' && router.pathname !== '/reset-password') {
          router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <ChakraProvider theme={theme}>
        <Center h="100vh">
          <Spinner size="xl" />
        </Center>
      </ChakraProvider>
    );
  }

  const getLayout = Component.getLayout || ((page) => page);

  return (
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ChakraProvider theme={theme}>
        {getLayout(<Component {...pageProps} currentUser={currentUser} role={role} />)}
      </ChakraProvider>
    </ErrorBoundary>
  );
}

export default MyApp; 