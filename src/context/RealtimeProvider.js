"use client";

import { createContext, useContext, useState } from "react";

const RealtimeContext = createContext({
  notifications: 0,
  resetNotifications: () => {},
});

export const RealtimeProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(0);

  // Realtime disabled untuk menghindari WebSocket errors

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
