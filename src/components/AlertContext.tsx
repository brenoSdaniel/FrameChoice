"use client";

import { createContext, useContext, useState } from "react";
import { Alert } from "@/components/Alert";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertData {
  type: AlertType;
  message: string;
}

interface AlertContextType {
  showAlert: (type: AlertType, message: string) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertData | null>(null);

  function showAlert(type: AlertType, message: string) {
    setAlert({ type, message });

    setTimeout(() => {
      setAlert(null);
    }, 4000);
  }

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return context;
}
