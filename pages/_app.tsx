import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import type { AppProps } from "next/app";
import ErrorBoundary from "../components/ErrorBoundary";

const theme = extendTheme({
  fonts: {
    heading: "'Sarabun', 'Prompt', 'Kanit', 'Noto Sans Thai', 'Inter', sans-serif",
    body: "'Sarabun', 'Prompt', 'Kanit', 'Noto Sans Thai', 'Inter', sans-serif",
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
      },
    },
  },
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <ChakraProvider theme={theme}>
        <Component {...pageProps} />
      </ChakraProvider>
    </ErrorBoundary>
  );
}

export default MyApp; 