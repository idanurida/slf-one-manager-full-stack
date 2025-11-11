"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

const RealtimeContext = createContext({
  notifications: 0,
  resetNotifications: () => {},
});

export const RealtimeProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    let channel;
    let isMounted = true;

    async function initRealtime() {
      try {
        console.log("[RealtimeProvider] 🔌 Connecting to notifications channel...");

        channel = supabase
          .channel("notifications_global")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "notifications" },
            () => {
              if (isMounted) {
                setNotifications((prev) => prev + 1);
              }
            }
          )
          .subscribe((status) => {
            console.log("[Realtime] Channel status:", status);
          });
      } catch (err) {
        console.error("[RealtimeProvider] Error initializing:", err);
      }
    }

    initRealtime();

    return () => {
      isMounted = false;
      if (channel) {
        console.log("[RealtimeProvider] 🧹 Cleaning up realtime channel...");
        setTimeout(() => supabase.removeChannel(channel), 400);
      }
    };
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        notifications,
        resetNotifications: () => setNotifications(0),
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
