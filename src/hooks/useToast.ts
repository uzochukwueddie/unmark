import { createContext, useContext } from 'react';
import type { ToastContextValue, ToastFn } from '../models/toast.model';

const ToastContext = createContext<ToastContextValue | null>(null);

const useToast = (): ToastFn => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return context.toast;
};

export { ToastContext, useToast };
