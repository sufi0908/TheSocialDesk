import { useToastContext } from '../context/ToastContext';

export function useToast() {
  const { addToast, removeToast, toasts } = useToastContext();

  return {
    toasts,
    toast: addToast,
    dismiss: removeToast,
    success: (title, message) => addToast({ title, message, type: 'success' }),
    error: (title, message) => addToast({ title, message, type: 'error' }),
    info: (title, message) => addToast({ title, message, type: 'info' }),
    warning: (title, message) => addToast({ title, message, type: 'warning' }),
  };
}
