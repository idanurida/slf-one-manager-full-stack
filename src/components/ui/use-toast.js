// FILE: src/components/ui/use-toast.js
// Bridge file - Wrapper untuk sonner agar kompatibel dengan useToast pattern lama
// Semua komponen yang menggunakan useToast akan otomatis menggunakan sonner
import { toast as sonnerToast } from "sonner";

// Wrapper toast function yang kompatibel dengan pattern lama
function toast(options) {
  const { title, description, variant, ...rest } = options || {};
  
  // Map variant ke sonner method
  if (variant === "destructive") {
    return sonnerToast.error(title || description, {
      description: title ? description : undefined,
      ...rest
    });
  }
  
  if (variant === "success" || title?.toLowerCase().includes("berhasil") || title?.toLowerCase().includes("sukses")) {
    return sonnerToast.success(title || description, {
      description: title ? description : undefined,
      ...rest
    });
  }
  
  if (variant === "warning") {
    return sonnerToast.warning(title || description, {
      description: title ? description : undefined,
      ...rest
    });
  }
  
  // Default toast
  return sonnerToast(title || description, {
    description: title ? description : undefined,
    ...rest
  });
}

// Hook wrapper - returns same API as before
function useToast() {
  return {
    toast,
    toasts: [], // Legacy compatibility - tidak digunakan dengan sonner
    dismiss: (toastId) => sonnerToast.dismiss(toastId),
  };
}

export { useToast, toast };
