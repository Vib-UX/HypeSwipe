'use client';

import { Toast } from '@/providers/ToastProvider';

interface ToastComponentProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export function ToastComponent({ toast, onDismiss }: ToastComponentProps) {
  const isSuccess = toast.type === 'success';

  return (
    <div
      onClick={() => onDismiss(toast.id)}
      className="relative w-full max-w-sm cursor-pointer transform transition-all duration-300 ease-in-out
        hover:scale-105 active:scale-95"
    >
      {isSuccess ? (
        <div className="bg-green-500/90 border border-green-400 text-white px-4 py-3 rounded-lg shadow-lg
          flex items-center gap-3 backdrop-blur-sm">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p className="text-sm font-medium flex-1">{toast.message}</p>
        </div>
      ) : (
        <div className="bg-red-500/90 border border-red-400 text-white px-4 py-3 rounded-lg shadow-lg
          flex items-center gap-3 backdrop-blur-sm">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <p className="text-sm font-medium flex-1">{toast.message}</p>
        </div>
      )}
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-h-[calc(100vh-2rem)] overflow-hidden pr-1">
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
