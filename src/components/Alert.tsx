"use client";

import styles from "./Alert.module.css";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertProps {
  type: AlertType;
  message: string;
  onClose: () => void;
}

export function Alert({ type, message, onClose }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[type]}`}>
      <span>{message}</span>
      <button onClick={onClose}>×</button>
    </div>
  );
}
