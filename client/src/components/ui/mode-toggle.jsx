// FILE: src/components/ui/mode-toggle.jsx

"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

// Import komponen dasar shadcn/ui
import { Button } from "@/components/ui/button" 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  // Hook dari 'next-themes' untuk mengontrol dan mendapatkan status tema
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      {/* Tombol yang memicu Dropdown. Menggunakan ikon Sun/Moon yang berotasi berdasarkan tema saat ini. */}
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {/* Ikon Matahari (Light Mode) */}
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          
          {/* Ikon Bulan (Dark Mode). Muncul hanya saat dark mode aktif. */}
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          
          {/* Teks untuk screen reader */}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      {/* Konten Dropdown (Menu Pilihan Tema) */}
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}