import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type {
  Toast,
  ToastFn,
  ToastItemProps,
  ToastType,
} from "../models/toast.model";
import { ToastContext } from "../hooks/useToast";

const ICONS: Record<ToastType, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✗",
};

const TONES: Record<ToastType, string> = {
  info: "border-info/40 text-info",
  success: "border-ok/40 text-ok",
  warning: "border-warn/40 text-warn",
  error: "border-bad/40 text-bad",
};

export function ToastProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback<ToastFn>(
    (message, type = "info", duration = 4000) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message, type, duration }]);
      return id;
    },
    [],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-4 z-9998 flex w-[min(92vw,22rem)] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            {...toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ message, type, duration, onDismiss }: ToastItemProps) {
  const [paused, setPaused] = useState<boolean>(false);

  return (
    <div
      role="status"
      onClick={onDismiss}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`animate-toast-in pointer-events-auto relative cursor-pointer overflow-hidden rounded-xl border bg-surface/95 px-4 py-3 pr-9 shadow-lg shadow-black/40 backgroup-blur ${TONES[type] || TONES.info}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-px text-sm leading-5">
          {ICONS[type] || ICONS.info}
        </span>
        <span className="text-[13px] leading-5 text-ink">{message}</span>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-xs transition hover:bg-hover hover:text-ink"
      >
        x
      </button>
      {duration > 0 && (
        <span
          onAnimationEnd={onDismiss}
          style={{
            animationDuration: `${duration}ms`,
            animationPlayState: paused ? "paused" : "running",
          }}
          className="absolute bottom-0 left-0 h-0.5 w-full origin-left animate-[drain_linear_forwards] bg-current/60"
        />
      )}
      <style>
        {
          "@keyframes drain { from { transform: scaleX(1) }  to { transform: scaleX(0) } }"
        }
      </style>
    </div>
  );
}
