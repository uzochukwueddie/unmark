export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

export type ToastFn = (
  message: string,
  type?: ToastType,
  duration?: number,
) => number;

export interface ToastContextValue {
  toast: ToastFn;
  dismiss: (id: number) => void;
}

export interface ToastItemProps extends Toast {
  onDismiss: () => void;
}
