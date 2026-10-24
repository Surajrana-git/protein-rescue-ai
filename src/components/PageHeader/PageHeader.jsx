import styles from './PageHeader.module.css'

export default function PageHeader({
  icon,
  iconColor = 'blue',
  title,
  subtitle,
  badge,
  badgeTooltip,
  rightSlot,
  className = '',
}) {
  return (
    <div className={`${styles.header} ${className}`}>
      <div className={styles.left}>
        <div className={`${styles.iconTile} ${styles[iconColor] || styles.blue}`}>
          {icon}
        </div>
        <div className={styles.titleCol}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{title}</h1>
            {badge && (
              <span
                className={styles.badge}
                title={badgeTooltip}
                tabIndex={badgeTooltip ? 0 : undefined}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>

      {rightSlot && <div className={styles.right}>{rightSlot}</div>}
    </div>
  )
}
