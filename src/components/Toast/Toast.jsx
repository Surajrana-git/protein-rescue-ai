import { useEffect } from 'react'
import { Info } from 'lucide-react'
import styles from './Toast.module.css'

export default function Toast({ message, onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => {
      onClose?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onClose])

  if (!message) return null

  return (
    <div className={styles.toastContainer} role="status" aria-live="polite">
      <div className={styles.toast}>
        <Info size={16} className={styles.icon} aria-hidden="true" />
        <span className={styles.message}>{message}</span>
        <button
          type="button"
          onClick={onClose}
          className={styles.closeBtn}
          aria-label="Dismiss message"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
