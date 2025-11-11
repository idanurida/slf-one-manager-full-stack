"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export default function IntroPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [fadeOut, setFadeOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Timer untuk perubahan langkah
    const timers = [
      setTimeout(() => setStep(1), 500), // Tampilkan logo
      setTimeout(() => setStep(2), 2500), // Tampilkan kalimat 1 ("Empowering Teams...")
      // Tampilkan kalimat 2 ("Powered by...") setelah kalimat 1 tampil penuh dan dibaca
      // Kita beri durasi animasi masuk 0.7s, lalu jeda sebelum pergi ke step 3.
      // Misalnya, total waktu step 2 adalah 3 detik (3000ms) sejak muncul.
      setTimeout(() => setStep(3), 5500), // 2500 + 3000
      // Timer untuk memulai fade out halaman, diperpanjang
      setTimeout(() => setFadeOut(true), 8500), // 5500 + 3000ms (waktu menampilkan step 3)
      // Timer untuk navigasi, diperpanjang
      setTimeout(() => router.push("/login"), 9500), // 8500 + 1000ms untuk fade out
    ];
    return () => timers.forEach(clearTimeout);
  }, [router]);

  if (!mounted) return null;

  return (
    <div
      className={`relative overflow-hidden min-h-screen flex items-center justify-center transition-all duration-1000 ease-in-out ${
        fadeOut ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      {/* 🌈 Animated Gradient Background (Agusta Palette) */}
      <div className="absolute inset-0 animate-gradientMove bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-secondary/10 to-destructive/10 dark:from-primary/5 dark:via-secondary/5 dark:to-destructive/5"></div>

      {/* Overlay lembut biar teks tetap kontras */}
      <div className="absolute inset-0 bg-background/70 dark:bg-background/80 backdrop-blur-[2px]"></div>

      {/* Theme Toggle - Mengikuti gaya shadcn/ui */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="fixed top-6 right-6 p-3 rounded-full bg-card border border-border text-foreground shadow-sm hover:shadow-md transition-all duration-300 z-50"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <main className="relative z-10 container max-w-3xl mx-auto px-6 text-center">
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-10">
          {/* LOGO */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.2 }}
            className="flex items-center justify-center gap-4"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0px rgba(0,0,0,0)",
                  "0 0 20px rgba(168, 85, 247, 0.3)", // Warna ungu Agusta
                  "0 0 0px rgba(0,0,0,0)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center"
            >
              <span className="text-2xl font-extrabold text-primary-foreground">SLF</span>
            </motion.div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-foreground">
              ONE
            </h1>
          </motion.div>

          {/* Divider - Warna Tema Agusta */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1, duration: 1, ease: "easeOut" }}
            className="w-24 h-1 bg-primary dark:bg-primary rounded-full mx-auto origin-left"
          />

          {/* Headings - Warna Tema Agusta */}
          {/* Tinggi kontainer disesuaikan untuk menampung kedua kalimat */}
          <div className="relative h-32 md:h-28 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              {step === 2 && (
                <motion.h2
                  key="heading-1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  // Durasi animasi masuk dan exit
                  transition={{ duration: 0.7 }}
                  className="text-2xl md:text-3xl font-semibold text-foreground"
                >
                  Empowering Teams with Smart Integration
                </motion.h2>
              )}
              {step === 3 && (
                <motion.h2
                  key="heading-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.7 }}
                  className="text-base md:text-lg font-medium text-foreground/80"
                >
                  Powered by{" "}
                  <span className="font-semibold text-primary">
                    PT. Puri Dimensi
                  </span>{" "}
                  — Trusted by 600+ Leading Clients
                </motion.h2>
              )}
            </AnimatePresence>
          </div>

          {/* Loading Indicator - Warna Tema Agusta */}
          {/* Delay munculnya loading indicator disesuaikan */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 7.5 }} // Muncul setelah step 3 (Powered by...) muncul
            className="flex flex-col items-center gap-4"
          >
            <div className="flex space-x-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-primary rounded-full"
                  animate={{
                    y: [0, -6, 0],
                    opacity: [1, 0.5, 1],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Menuju Halaman Login...
            </p>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 8, duration: 1 }} // Muncul sedikit setelah loading indicator
            className="text-xs text-muted-foreground"
          >
            © {new Date().getFullYear()} SLF One Manager — All Rights Reserved
          </motion.p>
        </div>
      </main>

      {/* 🌫️ CSS Keyframes for Gradient Animation */}
      <style jsx global>{`
        @keyframes gradientMove {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradientMove {
          background-size: 200% 200%;
          animation: gradientMove 12s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}