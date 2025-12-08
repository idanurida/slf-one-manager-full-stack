"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import Image from "next/image";

export default function IntroPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [fadeOut, setFadeOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 2200),
      setTimeout(() => setStep(3), 3700),
      setTimeout(() => setFadeOut(true), 7000),
      setTimeout(() => router.push("/login"), 8000),
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
      {/* Background Layers */}
      <div className="absolute inset-0 animate-gradientMove bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-secondary/10 to-destructive/10 dark:from-primary/5 dark:via-secondary/5 dark:to-destructive/5"></div>
      <div className="absolute inset-0 bg-background/70 dark:bg-background/80 backdrop-blur-[1px] md:backdrop-blur-[2px]"></div>

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="fixed top-4 right-4 p-2.5 md:top-6 md:right-6 md:p-3 rounded-full bg-card border border-border text-foreground shadow-sm hover:shadow-md transition-all duration-300 z-50"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="w-4 h-4 md:w-5 md:h-5" />
        ) : (
          <Moon className="w-4 h-4 md:w-5 md:h-5" />
        )}
      </button>

      {/* Main Content Container */}
      <main className="relative z-10 w-full px-4 md:px-6">
        <div className="max-w-md md:max-w-2xl mx-auto">
          {/* Logo Container */}
          <div className="flex flex-col items-center justify-center space-y-4 md:space-y-6 mb-6 md:mb-8">
            {/* Puri Dimensi Logo - WebP format */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.2 }}
              className="w-full max-w-[180px] md:max-w-[240px] aspect-[3/1] relative"
            >
              <Image
                src="/leaflet/images/logo-puri-dimensi.webp"
                alt="Logo Puri Dimensi"
                fill
                className="object-contain"
                priority
                sizes="(max-width: 768px) 180px, 240px"
              />
            </motion.div>

            {/* SLF ONE MANAGER Logo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col items-center gap-3 md:gap-4"
            >
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(0,0,0,0)",
                      "0 0 16px rgba(168, 85, 247, 0.25)",
                      "0 0 0px rgba(0,0,0,0)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-9 h-9 md:w-12 md:h-12 rounded-lg bg-primary flex items-center justify-center flex-shrink-0"
                >
                  <span className="text-base md:text-xl font-extrabold text-primary-foreground">
                    SLF
                  </span>
                </motion.div>
                <h1 className="text-2xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-tight">
                  ONE MANAGER
                </h1>
              </div>
            </motion.div>
          </div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1, duration: 1, ease: "easeOut" }}
            className="w-20 md:w-24 h-0.5 md:h-1 bg-primary dark:bg-primary rounded-full mx-auto origin-left mb-6 md:mb-8"
          />

          {/* Taglines Container */}
          <div className="h-16 md:h-20 lg:h-24 flex items-center justify-center w-full mb-6 md:mb-8">
            <AnimatePresence mode="wait">
              {step === 2 && (
                <motion.h2
                  key="heading-1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.7 }}
                  className="text-lg md:text-2xl lg:text-3xl font-semibold text-foreground px-4 text-center leading-relaxed"
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
                  className="text-sm md:text-base lg:text-lg font-medium text-foreground/80 px-4 text-center leading-relaxed max-w-2xl mx-auto"
                >
                  Powered by{" "}
                  <span className="font-semibold text-primary">
                    PT. Puri Dimensi
                  </span>{" "}
                  — Your Trusted Partner for Building Certification & Approval
                </motion.h2>
              )}
            </AnimatePresence>
          </div>

          {/* Loading Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 5.5 }}
            className="flex flex-col items-center gap-3 md:gap-4 mt-8 md:mt-12"
          >
            <div className="flex space-x-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2.5 h-2.5 md:w-3 md:h-3 bg-primary rounded-full"
                  animate={{
                    y: [0, -5, 0],
                    opacity: [1, 0.6, 1],
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
            <p className="text-xs md:text-sm text-muted-foreground">
              Menuju Halaman Login...
            </p>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 6, duration: 1 }}
            className="text-xs text-muted-foreground mt-12 md:mt-16 text-center"
          >
            © {new Date().getFullYear()} SLF One Manager — All Rights Reserved
          </motion.p>
        </div>
      </main>

      {/* CSS Keyframes */}
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