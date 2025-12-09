// FILE: src/components/layouts/AuthLayout.js
import React from "react";

export default function AuthLayout({ children }) {
  return (
    // ✅ Tambahkan class transition-all duration-300 untuk efek transisi halus
    <div
      className="min-h-screen flex justify-center items-center p-8 
                 bg-background text-foreground transition-all duration-300" // ✅ Tambahkan transition-all duration-300
    >
      <div
        // ✅ Tambahkan class transition-all duration-300 untuk efek transisi halus pada card
        className="bg-card border border-border rounded-xl shadow-lg p-8 
                   w-full max-w-md animate-fadeIn transition-all duration-300" // ✅ Tambahkan transition-all duration-300
      >
        {children}
      </div>
    </div>
  );
}
