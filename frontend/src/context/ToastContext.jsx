import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import ToastContainer from '../components/ui/ToastContainer'

const ToastContext = createContext(null)

let counter = 0
function nextId() {
  counter += 1
  return `toast-${Date.now()}-${counter}`
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const timersRef = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
  }, [])

  const push = useCallback((toast) => {
    const id = toast.id || nextId()
    const item = {
      id,
      type: toast.type || 'info',
      title: toast.title || '',
      message: toast.message || '',
      duration: toast.duration ?? (toast.type === 'error' ? 6000 : 4000),
      actionLabel: toast.actionLabel,
      onAction: toast.onAction,
    }
    setToasts((prev) => [...prev, item])
    if (item.duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        delete timersRef.current[id]
      }, item.duration)
    }
    return id
  }, [])

  const api = useMemo(() => ({
    show: push,
    success: (message, opts = {}) => push({ ...opts, type: 'success', message }),
    error: (message, opts = {}) => push({ ...opts, type: 'error', message }),
    warning: (message, opts = {}) => push({ ...opts, type: 'warning', message }),
    info: (message, opts = {}) => push({ ...opts, type: 'info', message }),
    loading: (message, opts = {}) => push({ ...opts, type: 'loading', message, duration: 0 }),
    dismiss,
    confirm: ({ title = 'Konfirmasi', message = '', confirmLabel = 'Ya', cancelLabel = 'Batal', tone = 'primary' } = {}) =>
      new Promise((resolve) => {
        setConfirmState({
          title,
          message,
          confirmLabel,
          cancelLabel,
          tone,
          resolve,
        })
      }),
  }), [push, dismiss])

  const handleConfirm = (value) => {
    if (confirmState) {
      confirmState.resolve(value)
      setConfirmState(null)
    }
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {confirmState && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" data-state="open">
          <div className="confirm-card" data-state="open">
            <div className={`confirm-icon confirm-icon--${confirmState.tone === 'danger' ? 'danger' : 'primary'}`}>
              {confirmState.tone === 'danger' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </div>
            <h3 className="confirm-title">{confirmState.title}</h3>
            <p className="confirm-message">{confirmState.message}</p>
            <div className="confirm-actions">
              <button type="button" className="btn-ghost-soft" onClick={() => handleConfirm(false)}>
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                className={confirmState.tone === 'danger' ? 'btn-danger-solid' : 'btn-primary-solid'}
                onClick={() => handleConfirm(true)}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

export default ToastContext
