import { Link } from 'react-router-dom'
import {
  FOOTER_FEATURES,
  FOOTER_ECONOMICS,
  FOOTER_BOTTOM_LINKS,
} from '../../data/landingData.js'
import { HACKTHEFORK_URL } from '../../config/links.js'
import styles from './LandingFooter.module.css'

export default function LandingFooter({ onScrollToUpload }) {
  function handleItemClick(e, item) {
    if (item.action === 'scroll-upload') {
      e.preventDefault()
      if (onScrollToUpload) {
        onScrollToUpload()
      } else {
        const el = document.getElementById('lab-report-upload-zone')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
          el.focus()
        }
      }
    }
  }

  return (
    <footer className={styles.footer} aria-label="Page Footer">
      <div className={styles.footerMain}>
        <div className={styles.footerInner}>
          {/* Left Column: Branding and credits */}
          <div className={styles.colBrand}>
            <Link to="/" className={styles.brandLink} aria-label="ProteinRescue AI Home">
              <span className={styles.logoBadge}>
                <img
                  src="/images/logo-dna.png"
                  alt="ProteinRescue AI DNA helix logo"
                  width={32}
                  height={32}
                  className={styles.logoImg}
                />
              </span>
              <span className={styles.brandTitle}>ProteinRescue AI</span>
            </Link>

            <p className={styles.hackathonText}>
              Created for Hack The Fork 2026 (India Edition) under Problem Statement 02: By-product Protein Upcycling.
            </p>

            <p className={styles.cyanLine}>
              NIFTEM-K • MOFPI Govt of India • Smart Protein Project
            </p>
          </div>

          {/* Middle Column: Key Features */}
          <div className={styles.colLinks}>
            <h3 className={styles.colHeading}>KEY FEATURES</h3>
            <ul className={styles.linkList}>
              {FOOTER_FEATURES.map((item) => (
                <li key={item.label}>
                  {item.action === 'scroll-upload' ? (
                    <button
                      type="button"
                      onClick={(e) => handleItemClick(e, item)}
                      className={styles.footerBtn}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link to={item.to} className={styles.footerLink}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column: Economics & Science */}
          <div className={styles.colLinks}>
            <h3 className={styles.colHeading}>ECONOMICS &amp; SCIENCE</h3>
            <ul className={styles.linkList}>
              {FOOTER_ECONOMICS.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className={styles.footerLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className={styles.bottomStrip}>
        <div className={styles.bottomInner}>
          <div className={styles.bottomRow}>
            <p className={styles.copyrightText}>
              2026 ProteinRescue AI. All models and cost calculators tagged with evidentiary confidence.
            </p>

            <div className={styles.bottomLinks}>
              {FOOTER_BOTTOM_LINKS.map((link) => (
                <Link key={link.label} to={link.to} className={styles.bottomLink}>
                  {link.label}
                </Link>
              ))}
              <a
                href={HACKTHEFORK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.bottomLink}
              >
                hack the fork. in
              </a>
            </div>
          </div>

          {/* Mandatory extra small disclaimer line */}
          <p className={styles.disclaimerText}>
            Sample outputs are illustrative simulations, not scientifically validated, and not a food-safety or FSSAI determination.
          </p>
        </div>
      </div>
    </footer>
  )
}
