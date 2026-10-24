import { Check, ArrowDown, AlertCircle } from 'lucide-react'
import styles from './StatusBadge.module.css'

export default function StatusBadge({ status, className = '' }) {
  if (status === 'Completed') {
    return (
      <span className={`${styles.badge} ${styles.completed} ${className}`}>
        <Check className={styles.icon} size={13} strokeWidth={2.5} aria-hidden="true" />
        <span>Completed</span>
      </span>
    )
  }

  if (status === 'Processing') {
    return (
      <span className={`${styles.badge} ${styles.processing} ${className}`}>
        <ArrowDown className={styles.icon} size={13} strokeWidth={2.5} aria-hidden="true" />
        <span>Processing</span>
      </span>
    )
  }

  return (
    <span className={`${styles.badge} ${styles.failed} ${className}`}>
      <AlertCircle className={styles.icon} size={13} strokeWidth={2.5} aria-hidden="true" />
      <span>Failed</span>
    </span>
  )
}
