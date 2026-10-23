import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '../../data/landingData.js'
import { HACKTHEFORK_URL } from '../../config/links.js'
import styles from './LandingHeader.module.css'

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close hamburger menu on location change or Escape key
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  return (
    <header className={styles.header}>
      {/* A. Top utility bar */}
      <div className={styles.utilityBar}>
        <div className={styles.utilityInner}>
          <div className={styles.utilityLeft}>
            <span className={styles.utilityText}>Smart Protein Project | NIFTEM-K</span>
            <span className={styles.pillNavy}>
              <svg className={styles.gearIcon} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 4.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5zM6.25 8a1.75 1.75 0 1 1 3.5 0 1.75 1.75 0 0 1-3.5 0z" />
                <path fillRule="evenodd" d="M7.1 1.25a.75.75 0 0 1 1.8 0l.28 1.15a5.55 5.55 0 0 1 1.34.56l1.04-.6a.75.75 0 0 1 1.03.27l1.25 2.16a.75.75 0 0 1-.27 1.03l-1.04.6c.1.44.15.9.15 1.38s-.05.94-.15 1.38l1.04.6a.75.75 0 0 1 .27 1.03l-1.25 2.16a.75.75 0 0 1-1.03.27l-1.04-.6a5.55 5.55 0 0 1-1.34.56l-.28 1.15a.75.75 0 0 1-1.8 0l-.28-1.15a5.55 5.55 0 0 1-1.34-.56l-1.04.6a.75.75 0 0 1-1.03-.27L2.1 12.04a.75.75 0 0 1 .27-1.03l1.04-.6A5.4 5.4 0 0 1 3.26 9c0-.48.05-.94.15-1.38l-1.04-.6a.75.75 0 0 1-.27-1.03L3.35 3.83a.75.75 0 0 1 1.03-.27l1.04.6c.4-.24.85-.43 1.34-.56L7.1 1.25z" clipRule="evenodd" />
              </svg>
              <span>NIFTEM·MOFPI India</span>
            </span>
            <span className={styles.utilityText}>HACK THE FORK 2026</span>
            <span className={styles.pillYellow}>INDIA EDITION</span>
          </div>

          <div className={styles.utilityRight}>
            <a
              href={HACKTHEFORK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.utilityLink}
              aria-label="Visit hackthefork.in"
            >
              <svg className={styles.mailIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span>hackthefork.in</span>
            </a>

            <Link to="/login" className={styles.loginPill}>
              <span>LOGIN</span>
              <svg className={styles.arrowIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* B. Main nav bar */}
      <nav className={styles.mainNav} aria-label="Main Navigation">
        <div className={styles.mainNavInner}>
          <Link to="/" className={styles.brand} aria-label="ProteinRescue AI Home">
            <span className={styles.logoBadge}>
              <img
                src="/images/logo-dna.png"
                alt="ProteinRescue AI DNA helix logo"
                width={28}
                height={28}
                className={styles.logoImg}
              />
            </span>
            <span className={styles.brandTitle}>ProteinRescue AI</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className={styles.navLinks}>
            {NAV_ITEMS.map(({ to, label }) => {
              const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                >
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Hamburger toggle button for narrow viewports */}
          <button
            type="button"
            className={styles.hamburgerBtn}
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
          >
            <span className={`${styles.bar} ${menuOpen ? styles.barOpenTop : ''}`} />
            <span className={`${styles.bar} ${menuOpen ? styles.barOpenMid : ''}`} />
            <span className={`${styles.bar} ${menuOpen ? styles.barOpenBot : ''}`} />
          </button>
        </div>

        {/* Mobile / Responsive Collapse Menu */}
        {menuOpen && (
          <div className={styles.mobileMenu} role="dialog" aria-label="Mobile navigation">
            <div className={styles.mobileLinks}>
              {NAV_ITEMS.map(({ to, label }) => {
                const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={`${styles.mobileNavLink} ${isActive ? styles.mobileNavLinkActive : ''}`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
