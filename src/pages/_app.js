// FILE: src/pages/_app.js - VERSI BERSIH
import "@/styles/globals.css";
import Head from "next/head";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

export default function MyApp({ Component, pageProps }) {
  const [isReady, setIsReady] = useState(false);

  // Simple ready state - no complex patches
  if (typeof window !== 'undefined' && !isReady) {
    setIsReady(true);
  }

  // Disable console in production
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    console.log = () => { };
    console.warn = () => { };
    console.error = () => { };
    console.debug = () => { };
    console.info = () => { };
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
      </Head>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <Component {...pageProps} />
          <Toaster
            position="top-right"
            duration={4000}
            closeButton
            richColors
            theme="system"
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
