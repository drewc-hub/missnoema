import React from "react";
import { createPortal } from "react-dom";

import { useToast, type ToastType } from "@/composables/useToast";

export default function ToastStack() {
  const { toasts, dismiss } = useToast();

  function getIcon(type: ToastType): string {
    switch (type) {
      case "error":
        return "!";
      case "warning":
        return "?";
      case "success":
        return "✓";
      case "info":
        return "i";
      default:
        return "!";
    }
  }

  return createPortal(
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">{getIcon(toast.type)}</span>

            <div className="toast-message">
              {toast.title && <strong>{toast.title}</strong>}
              <p>{toast.message}</p>
            </div>

            <button
              className="toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>

          {toast.duration > 0 && (
            <div
              className="toast-progress"
              style={{ animationDuration: `${toast.duration}ms` }}
              onAnimationEnd={() => dismiss(toast.id)}
            />
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}
