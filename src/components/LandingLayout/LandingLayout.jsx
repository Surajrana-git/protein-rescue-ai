import { Outlet } from 'react-router-dom'
import LandingHeader from '../LandingHeader/LandingHeader.jsx'
import LandingFooter from '../LandingFooter/LandingFooter.jsx'
import styles from './LandingLayout.module.css'

export default function LandingLayout() {
  function handleScrollToUpload() {
    const el = document.getElementById('lab-report-upload-zone')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus()
    }
  }

  return (
    <div className={styles.layout}>
      {/* Accessibility Skip Link */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      <LandingHeader />

      <main id="main-content" className={styles.main}>
        <Outlet context={{ onScrollToUpload: handleScrollToUpload }} />
      </main>

      <LandingFooter onScrollToUpload={handleScrollToUpload} />
    </div>
  )
}
