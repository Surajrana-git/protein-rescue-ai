import { Link } from 'react-router-dom'
import styles from './ComingSoon.module.css'

export default function ComingSoon({ title }) {
  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>This section is coming soon.</p>
        <Link to="/" className={styles.link}>Back to Home</Link>
      </div>
    </main>
  )
}
