"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";

interface ToastMessage {
  id: number;
  message: string;
  isError: boolean;
}

interface ToastContextValue {
  showToast: (message: string, isError?: boolean) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, isError = false) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} isError={toast.isError} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ message, isError }: { message: string; isError: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`px-5 py-3 rounded-xl text-sm font-medium border transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${
        isError
          ? "bg-[#4d1a1a] text-[#f87171] border-[#6d2a2a]"
          : "bg-[#1a4d2e] text-[#4ade80] border-[#2a6d3e]"
      }`}
    >
      {message}
    </div>
  );
}
