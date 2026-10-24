import styles from './IconTile.module.css'

export default function IconTile({
  children,
  color = 'blue',
  size = 'md',
  className = '',
  'aria-hidden': ariaHidden = true,
}) {
  return (
    <div
      className={`${styles.tile} ${styles[color] || styles.blue} ${styles[size] || styles.md} ${className}`}
      aria-hidden={ariaHidden}
    >
      {children}
    </div>
  )
}
