import styles from './Card.module.css'

export default function Card({ title, children, className = '' }) {
  return (
    <div className={`${styles.card} ${className}`}>
      {title && <div className={styles.cardTitle}>{title}</div>}
      {children}
    </div>
  )
}
