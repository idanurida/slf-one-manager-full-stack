// FILE: src/pages/_app.js
import "@/styles/globals.css";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner"; // ✅ Tambahkan toast notification

// ✅ Query Client dengan optimasi performa
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 menit
      gcTime: 10 * 60 * 1000, // 10 menit (ganti dari cacheTime di v5)
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1, // ✅ Bukan false, tapi 1 retry untuk network error sementara
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// ✅ Custom Loading Component dengan tema DeepSeek
function CustomLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1419]">
      <div className="text-center">
        <div className="relative">
          {/* ✅ Loading spinner dengan tema DeepSeek */}
          <div className="w-12 h-12 border-4 border-[#00C2FF]/20 rounded-full animate-spin border-t-[#00C2FF] border-r-[#00FFD1]"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#00C2FF] rounded-full animate-pulse"></div>
        </div>
        <p className="mt-4 text-slate-600 dark:text-slate-400 font-roboto text-sm">
          Memuat SLF Manager...
        </p>
      </div>
    </div>
  );
}

export default function MyApp({ Component, pageProps }) {
  // ✅ State untuk menghindari hydration mismatch
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // ✅ Handle hydration dengan lebih baik
    const handleReady = () => {
      setIsReady(true);
    };

    // ✅ Jika komponen sudah mounted, set ready immediately
    if (document.readyState === 'complete') {
      handleReady();
    } else {
      window.addEventListener('load', handleReady);
      // ✅ Fallback timeout untuk kasus edge
      const timeoutId = setTimeout(handleReady, 1000);
      
      return () => {
        window.removeEventListener('load', handleReady);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  // ✅ Tampilkan loading screen yang lebih informatif
  if (!isReady) {
    return <CustomLoading />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="system" 
        enableSystem
        disableTransitionOnChange={false} // ✅ Biarkan transisi smooth
      >
        <AuthProvider>
          {/* ✅ Main Application */}
          <Component {...pageProps} />
          
          {/* ✅ Global Toast Notification dengan tema DeepSeek */}
          <Toaster
            position="top-right"
            duration={4000}
            closeButton
            richColors
            theme="system"
            toastOptions={{
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
                fontFamily: 'Roboto, sans-serif',
              },
              className: 'font-roboto',
            }}
          />
          
          {/* ✅ Global Error Boundary bisa ditambahkan di sini */}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}