import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import ErrorBoundary from "../components/ErrorBoundary";
import "../styles/fonts.css";
import "../styles/globals.css";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";

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
        bg: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
        color: "gray.800",
        fontFamily: "'Kanit', 'Sarabun', 'Prompt', 'Noto Sans Thai', 'Inter', sans-serif",
      },
    },
  },
});

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  return (
    <ErrorBoundary>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <ChakraProvider theme={theme}>
        <AnimatePresence mode="wait">
          <motion.div
            key={router.route}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{ minHeight: "100vh" }}
          >
            <Component {...pageProps} />
          </motion.div>
        </AnimatePresence>
      </ChakraProvider>
    </ErrorBoundary>
  );
}

export default MyApp; 