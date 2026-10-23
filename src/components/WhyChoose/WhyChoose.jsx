import { Link } from 'react-router-dom'
import { FEATURE_CARDS } from '../../data/landingData.js'
import styles from './WhyChoose.module.css'

export default function WhyChoose() {
  return (
    <section className={styles.section} aria-label="Why Choose ProteinRescue AI">
      <h2 className={styles.heading}>Why Choose ProteinRescue AI</h2>

      <div className={styles.grid}>
        {/* Left column: 3 stacked lavender-blue cards */}
        <div className={styles.leftCol}>
          {FEATURE_CARDS.map((card) => (
            <Link
              key={card.title}
              to={card.to}
              className={styles.featureCard}
              aria-label={`${card.title}: ${card.text}`}
            >
              <div className={styles.iconWrapper}>
                <img
                  src={card.icon}
                  alt={card.iconAlt}
                  width={56}
                  height={56}
                  loading="lazy"
                  className={styles.featureIcon}
                />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <p className={styles.cardText}>{card.text}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Right column: Large white card with typography & photo */}
        <div className={styles.rightCard}>
          <div className={styles.overlayText}>
            <div className={styles.smartYourHeading}>SMART YOUR</div>
            <div className={styles.logoPhraseRow}>
              <span className={styles.dnaLogoBadge}>
                <img
                  src="/images/logo-dna.png"
                  alt="ProteinRescue AI DNA Helix"
                  width={24}
                  height={24}
                  loading="lazy"
                  className={styles.dnaLogoImg}
                />
              </span>
              <div className={styles.phraseCol}>
                <span className={styles.wasteWithLabel}>WASTE WITH</span>
                <span className={styles.proteinRescueLabel}>ProteinRescue AI</span>
              </div>
            </div>
          </div>

          <div className={styles.personPhotoWrapper}>
            <img
              src="/images/hero-person.png"
              alt="Professional researcher smiling in laboratory"
              loading="lazy"
              className={styles.personImg}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
